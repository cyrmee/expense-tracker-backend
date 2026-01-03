#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +o allexport
else
  echo "ERROR: .env file not found at '$ENV_FILE'. Set ENV_FILE to override." >&2
  exit 1
fi

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: Required env var '$name' is missing/empty (from $ENV_FILE)." >&2
    exit 1
  fi
}

# 1. Prep Image for Kind
CLUSTER_NAME="dev-cluster"

if kind get clusters | grep -q "^$CLUSTER_NAME$"; then
  echo "Cluster '$CLUSTER_NAME' already exists. Skipping creation."
else
  echo "Creating cluster '$CLUSTER_NAME'..."
  kind create cluster --name $CLUSTER_NAME --config kind-config.yaml
fi

docker pull cyrme/expense-tracker-backend:latest
kind load docker-image cyrme/expense-tracker-backend:latest --name $CLUSTER_NAME


# 2. Create Secrets (Fixed comment syntax)
require_env POSTGRES_PASSWORD
require_env RESEND_API_KEY
require_env GEMINI_API_KEY
require_env JWT_SECRET
require_env ENCRYPTION_IV
require_env ENCRYPTION_SECRET_KEY
require_env ENCRYPTION_SALT
require_env OPENEXCHANGERATES_APP_ID
require_env DATABASE_URL

# Optional but commonly used by Prisma
DIRECT_URL="${DIRECT_URL:-}"

kubectl create secret generic app-secrets \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=RESEND_API_KEY="$RESEND_API_KEY" \
  --from-literal=GEMINI_API_KEY="$GEMINI_API_KEY" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=ENCRYPTION_IV="$ENCRYPTION_IV" \
  --from-literal=ENCRYPTION_SECRET_KEY="$ENCRYPTION_SECRET_KEY" \
  --from-literal=ENCRYPTION_SALT="$ENCRYPTION_SALT" \
  --from-literal=OPENEXCHANGERATES_APP_ID="$OPENEXCHANGERATES_APP_ID" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  ${DIRECT_URL:+--from-literal=DIRECT_URL="$DIRECT_URL"} \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Create ConfigMap
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  PORT: "5000"
  FRONTEND_URL: "*"
  FROM_EMAIL: "noreply@mehretab.com"
  APP_NAME: "ExpenseTrackerApp"
  GEMINI_MODEL: "gemini-2.5-flash"
  JWT_ACCESS_EXPIRATION: "15m"
  JWT_REFRESH_EXPIRATION: "1d"
  OPENEXCHANGERATES_API_URL: "https://openexchangerates.org/api/latest.json"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  REDIS_URL: "redis://redis-service:6379"
  POSTGRES_USER: "postgres"
  POSTGRES_DB: "expense-tracker-db"
EOF

# 4. Deploy Redis (StatefulSet)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
    - port: 6379
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: "redis-service"
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:alpine
        args: ["--appendonly", "yes", "--maxmemory", "400mb", "--maxmemory-policy", "allkeys-lru"]
        resources:
          limits:
            memory: "512Mi"
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
EOF

# 5. Deploy Postgres (StatefulSet)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: "postgres-service"
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: "expense-tracker-db"
        volumeMounts:
        - name: pg-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: pg-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 2Gi
EOF

# 6. Deploy NestJS App (With Automated Retry Migration)
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: expense-tracker-api
spec:
  replicas: 4
  selector:
    matchLabels:
      app: expense-tracker
  template:
    metadata:
      labels:
        app: expense-tracker
    spec:
      initContainers:
      - name: db-migration
        image: cyrme/expense-tracker-backend:latest
        imagePullPolicy: IfNotPresent
        command: ["/bin/sh", "-c"]
        args:
          - |
            # DISPLAY THE VALUE (Masking the password for safety)
            echo "The current DATABASE_URL is: \${DATABASE_URL%:*}:****@\${DATABASE_URL#*@}"
            
            echo "Waiting for postgres-service:5432..."
            until printf "." && nc -z postgres-service 5432; do
              sleep 2
            done
            
            echo "Database is reachable. Running npx prisma migrate deploy..."
            npx prisma migrate deploy
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets

      containers:
      - name: api
        image: cyrme/expense-tracker-backend:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        env:
        - name: NODE_OPTIONS
          value: "--max-old-space-size=400"
        resources:
          limits:
            memory: "512Mi"
          requests:
            memory: "350Mi"
EOF
