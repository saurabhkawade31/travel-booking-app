# 🌍 Full-Stack Travel Booking CI/CD & Kubernetes Deployment

![Architecture Diagram](https://img.shields.io/badge/Architecture-Microservices-blue)
![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-red)
![SonarQube](https://img.shields.io/badge/SonarQube-Quality_Gate-4d9bda)
![Docker](https://img.shields.io/badge/Docker-Containerization-2496ed)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Kubeadm-326ce5)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900)

An end-to-end production-grade DevOps implementation that automates the building, testing, and rolling deployment of a Full-Stack Node.js travel application (React/Vite Frontend, Express/TypeScript Backend) onto a self-hosted, multi-node Kubeadm Kubernetes cluster on AWS EC2.


## 🏗️ Phase 1: Tools Server Infrastructure Setup (Ubuntu 24.04 EC2)

The Tools Server acts as the core orchestration hub, managing the isolated instances of Jenkins and SonarQube via containerized runtimes.

### 1. Docker Engine Installation
```bash
# Update the local package repository
sudo apt-get update -y

# Install prerequisite security and transport management libraries
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker’s official GPG verification key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL [https://download.download.docker.com/linux/ubuntu/gpg](https://download.download.docker.com/linux/ubuntu/gpg) | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the stable repository distribution index
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] [https://download.docker.com/linux/ubuntu](https://download.docker.com/linux/ubuntu) \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine components
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configure current non-root user account to run Docker commands
sudo usermod -aG docker $USER
newgrp docker
```
### 2. Containerized Jenkins Setup (Docker-out-of-Docker Architecture)
```bash
# Launch Jenkins with the host Docker daemon socket mapped directly inside the container runtime
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(which docker):/usr/bin/docker \
  --root \
  --restart always \
  jenkins/jenkins:lts

# Retrieve the initial administrative unlocking password
docker exec -it jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 3. Containerized SonarQube Deployment
```bash
# Dynamically adjust host OS kernel max map count limits for embedded Elasticsearch requirements
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/security/limits.conf

# Spin up the SonarQube container image
docker run -d \
  --name sonarqube \
  -p 9000:9000 \
  --restart always \
  sonarqube:lts-community
```

## ☸️ Phase 2: Kubeadm Cluster Secret & Config Management
The production environment runs on a bare-metal style Kubernetes setup provisioned manually through Kubeadm.

### 1. Mandatory Cluster Maintenance
```bash
# Completely disable memory swap files to prevent Kubelet execution engine panics
sudo swapoff -a

# Ensure swap parameters persist correctly during unexpected reboots
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

### 2. Production Application Secrets Management
Generate a cryptographically secure 32-character encryption payload for managing app sessions:

```bash
openssl rand -base64 32
```

Create the application configuration layer travel-app-secret.yaml on the Master Node. Multi-line parameters (like Google API Private Keys) must preserve strict YAML whitespace block structure.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: travel-app-secret
type: Opaque
stringData:
  GOOGLE_PRIVATE_KEY: |
    -----BEGIN PRIVATE KEY-----
    MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3Vz...
    ... [Insert full block preserving alignment indentation] ...
    -----END PRIVATE KEY-----
  GOOGLE_CLIENT_EMAIL: "travel-booking-service-account@your-project.iam.gserviceaccount.com"
  JWT_SECRET: "YOUR_GENERATED_OPENSSL_STRING"
```

Apply and immediately erase the text-readable local tracking file:

```bash
# Inject credentials directly to the secure internal cluster state
kubectl apply -f travel-app-secret.yaml

# Securely erase the local raw disk file to prevent credential harvesting
rm travel-app-secret.yaml
```

## 🔗 Phase 3: Cluster Cross-Authentication Bridge
To establish a communication bridge between your separated cloud compute layers:

```bash
# Create the structural target directory map paths inside the Jenkins context
docker exec -u root jenkins mkdir -p /root/.kube

# Copy administrative credentials from the local host context into the internal container path
docker cp ~/.kube/config jenkins:/root/.kube/config

# Enforce secure read/write file execution parameters on the configuration file
docker exec -u root jenkins chmod 600 /root/.kube/config
```

### SonarQube Webhook Configuration:
To allow non-blocking asynchronous validation steps inside your execution tree, log into the SonarQube console at http://<TOOLS_IP>:9000, navigate through Administration ➔ Configuration ➔ Webhooks, and add a listener path target:

```text
http://<TOOLS_SERVER_PUBLIC_IP>:8080/sonarqube-webhook/
```

## 🚀 Phase 4: Production Jenkinsfile Pipeline Specification
```groovy
pipeline {
    agent any

    environment {
        DOCKER_REGISTRY_CREDENTIALS_ID = 'docker-hub-creds'
        DOCKER_IMAGE_NAME              = 'vivekbhangre/travel-booking-app'
        IMAGE_TAG                      = "${BUILD_NUMBER}"
        
        // Git Configuration
        GIT_REPO_URL                   = 'https://github.com/vivekbhangre/YuvRaj-Tours-Travelers.git'
        GIT_BRANCH                     = 'main'
        
        // SonarQube Project Details
        SONAR_PROJECT_KEY              = 'travel-booking-app'
        SONAR_PROJECT_NAME             = 'Travel Booking Web Application'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                echo "Cloning branch ${GIT_BRANCH} from public repository..."
                git branch: "${GIT_BRANCH}", url: "${GIT_REPO_URL}"
            }
        }

        stage('SonarQube Code Analysis') {
            environment {
                // Fetches the tool dynamically for this stage only
                SCANNER_HOME = tool 'sonar-scanner'
            }
            steps {
                withSonarQubeEnv('SonarQube') {
                    echo "Initiating static code analysis..."
                    sh "${SCANNER_HOME}/bin/sonar-scanner \
                        -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                        -Dsonar.projectName='${SONAR_PROJECT_NAME}' \
                        -Dsonar.sources=. \
                        -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/.next/**"
                }
            }
        }

        stage('Quality Gate Enforcer') {
            steps {
                echo "Checking quality gate status..."
                timeout(time: 5, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Pipeline aborted due to SonarQube Quality Gate failure: ${qg.status}"
                        }
                    }
                }
            }
        }

        stage('Dockerize Application') {
            steps {
                echo "Building production Docker image with tag: ${IMAGE_TAG}..."
                sh "docker build -t ${DOCKER_IMAGE_NAME}:${IMAGE_TAG} -t ${DOCKER_IMAGE_NAME}:latest ."
            }
        }

        stage('Publish to Docker Hub') {
            steps {
                echo "Authenticating and uploading image to Docker Hub..."
                withCredentials([usernamePassword(credentialsId: "${DOCKER_REGISTRY_CREDENTIALS_ID}", passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                    sh "echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin"
                    sh "docker push ${DOCKER_IMAGE_NAME}:${IMAGE_TAG}"
                    sh "docker push ${DOCKER_IMAGE_NAME}:latest"
                }
            }
        }

        stage('CD Deploy to Kubeadm Cluster') {
            steps {
                echo "Updating deployment manifest with target image tag..."
                sh "sed -i 's|image: ${DOCKER_IMAGE_NAME}:.*|image: ${DOCKER_IMAGE_NAME}:${IMAGE_TAG}|g' k8s/deployment.yaml"
                
                echo "Applying manifests to the Kubernetes cluster..."
                sh "kubectl apply -f k8s/configmap.yaml"
                sh "kubectl apply -f k8s/deployment.yaml"
                
                echo "Verifying rolling update status..."
                sh "kubectl rollout status deployment/travel-booking-deployment --timeout=120s"
            }
        }
    }

    post {
        always {
            echo "Cleaning workspace to preserve space on our 20GB volume..."
            cleanWs()
        }
    }
}
```
## ⚙️ Phase 5 How to Set Up the Jenkins Pipeline

Follow these exact steps in the Jenkins UI to configure your pipeline using the direct script method, set up your external tool integrations, and enable automatic GitHub polling.

### Step 1: Add Docker Hub Credentials to Jenkins
Before creating the pipeline, Jenkins needs permission to push your newly built images to Docker Hub.
1. From the Jenkins dashboard, click **Manage Jenkins** on the left menu.
2. Click on **Credentials** (under Security).
3. Click on the **(global)** domain, then click **Add Credentials** in the top right.
4. Set the following values:
   * **Kind:** Username with password
   * **Username:** Your Docker Hub username (e.g., `vivekbhangre`)
   * **Password:** Your Docker Hub password or access token
   * **ID:** `docker-hub-creds` *(This must match the ID written in the pipeline script exactly)*
5. Click **Create**.

### Step 2: Generate the SonarQube Token
To allow Jenkins to send code analysis reports to SonarQube, you must generate an authentication token.
1. Log in to your SonarQube dashboard.
2. Navigate to **Administration** -> **Security** -> **Users** and click on the **Tokens** icon.
3. Enter a name for the token (e.g., `jenkins-token`), set an expiration, and click **Generate**.
4. Copy the generated token string immediately, as it will not be shown again.

### Step 3: Add the SonarQube Token to Jenkins
1. Open the Jenkins dashboard and navigate to **Manage Jenkins** -> **Credentials** -> **System** -> **Global credentials**.
2. Click **Add Credentials** and set the **Kind** to **Secret text**.
3. Paste your copied SonarQube token into the **Secret** field.
4. Set the **ID** strictly to `sonar-token` and add a matching description. 
5. Click **Create**.

### Step 4: Link the SonarQube Server in Jenkins
1. Go to **Manage Jenkins** -> **System** and scroll down to the **SonarQube servers** section.
2. Click **Add SonarQube**.
3. Set the **Name** to exactly `SonarQube` *(this exact name is required for the pipeline script to recognize it)*.
4. Enter your **Server URL** (e.g., `http://<YOUR_EC2_PUBLIC_IP>:9000/`).
5. Under the **Server authentication token** dropdown, select the `sonar-token` credential you just created.
6. Click **Save** at the bottom of the page.

### Step 5: Create the Pipeline Job
1. Go back to the main Jenkins dashboard and click **New Item** on the left menu.
2. Enter a name for your project (e.g., `travel-booking-pipeline`).
3. Click on **Pipeline** and then click **OK** at the bottom.

### Step 6: Configure Automatic Triggers (Poll SCM)
To make the pipeline run automatically whenever you push new code to GitHub:
1. On the configuration page, scroll down to the **Build Triggers** section.
2. Check the box for **Poll SCM**.
3. In the **Schedule** text box that appears, enter 5 asterisks separated by spaces: `* * * * *`
4. *(This cron syntax tells Jenkins to check your GitHub repository every single minute for new commits).*

### Step 7: Add the Pipeline Script
1. Scroll all the way down to the **Pipeline** section.
2. Ensure the **Definition** dropdown menu is set to **Pipeline script**.
3. Copy the entire declarative Groovy pipeline script provided in the section above.
4. Paste the code directly into the large **Script** text box.
5. Click **Save** at the bottom.

### Step 8: Run Your First Build
1. You will be redirected to your new Pipeline dashboard.
2. Click **Build Now** on the left menu to run the first build manually.
3. After this first manual run, Jenkins will automatically detect any new changes you push to GitHub and trigger the pipeline on its own!

---

## 📸 Project Screenshots

### AWS Dashboard Tools Server and Kubeadm CLuster
<img width="1919" height="1079" alt="aws_dashboard" src="https://github.com/user-attachments/assets/0e71f33b-9387-4fbc-a281-8f520b737a23" />

---
### 1. Jenkins 
<img width="1919" height="1079" alt="1jenkins" src="https://github.com/user-attachments/assets/f4813256-550e-46ea-944f-deaba0aed064" />
<img width="1918" height="1079" alt="2jenkins" src="https://github.com/user-attachments/assets/fbbe804a-8cd1-431e-8f87-ba94969d5442" />

---
### 2. SonarQube
<img width="1919" height="1079" alt="3sq" src="https://github.com/user-attachments/assets/60ac8f23-d128-4f3c-9297-1e01e793a513" />
<img width="1919" height="1079" alt="3sq1" src="https://github.com/user-attachments/assets/75178e6c-b943-4190-85fb-72155f468ff8" />

---
### 3. Cofiguring/linking Kubectl in Jenkins Server & Copying kubeConfig
<img width="960" height="209" alt="4kubectl_link_to_kubeadm_cluster" src="https://github.com/user-attachments/assets/0c6c06eb-2d7f-4724-a926-3cb484715d46" />
<img width="1919" height="1079" alt="4_1" src="https://github.com/user-attachments/assets/246ad91d-5f77-4c10-bb33-4e93aeed7b17" />
<img width="958" height="151" alt="4_2_test_getting_node" src="https://github.com/user-attachments/assets/fda69999-d0cf-443c-8827-77a9300fd3fc" />

---
### 4. Token Generating for SonarQube & Configuring it in Jenkins For Code Quality Checks
<img width="1919" height="1079" alt="5_token_generate_sq" src="https://github.com/user-attachments/assets/e021bc9a-a9f2-4737-af0c-a57db3bca44a" />
<img width="1919" height="1079" alt="5_1sonar_token_in _jenkins" src="https://github.com/user-attachments/assets/7eb07298-4ecc-4680-92ae-a35234951bf2" />
<img width="1919" height="1079" alt="5_2_sonar_config_in_jenkins" src="https://github.com/user-attachments/assets/66385b65-ab0f-4306-bd13-f8d79daee9af" />

---
### 5. Configuring Docker in Jenkins
<img width="1919" height="1079" alt="6_docker_config_in_jenkins" src="https://github.com/user-attachments/assets/23bd189a-ee84-4a0f-a961-74e133d238ec" />

---
### 6. Jenkins Job/Pipeline Configuring
<img width="1919" height="1079" alt="7_job_creating" src="https://github.com/user-attachments/assets/a0aa4f60-c2d7-4ed0-a126-96e79d8c51e5" />
<img width="1919" height="1079" alt="7_1" src="https://github.com/user-attachments/assets/945b8c6a-5e52-4f44-a0dc-da3e646f8d98" />

---
### 7. Jenkins Pipeline Execution Success
<img width="1919" height="1079" alt="built_success" src="https://github.com/user-attachments/assets/4724ca65-2ac4-44c2-a6b3-d67c58508443" />

---
### 8. SonarQube Code Quality Analysis Dashboard
<img width="1919" height="1079" alt="9_Code_Quality_Analysis" src="https://github.com/user-attachments/assets/7f368d4c-ce7c-479e-87e2-8e274797c0ba" />

---
### 9. Docker Hub Dashboard
<img width="1919" height="1078" alt="dockerizewebsite" src="https://github.com/user-attachments/assets/fe206b69-3dc0-4a9b-8017-a877b98c73eb" />

---
### 10. Kubernetes Pods Status Verification
<img width="1919" height="220" alt="terminal_pods_svc" src="https://github.com/user-attachments/assets/bee6d7e6-8492-46fd-8bd4-f7cb3a621204" />

---
### 11. Output

https://github.com/user-attachments/assets/129c682d-a350-4b35-8c15-5db7a489ea6c

<img width="1919" height="1079" alt="admin_dashboard" src="https://github.com/user-attachments/assets/7d55b1b1-77aa-4c27-829d-f2aeae547d77" />
<img width="1919" height="1079" alt="admin_dashboard_1" src="https://github.com/user-attachments/assets/c749c37d-7887-4b08-87e6-55e17ba1a595" />

---

## 🧠 What I Learnt From This Project
1. Built and automated a complete CI/CD pipeline using Jenkins, enabling faster and reliable application deployments.
2. Gained hands-on experience in Docker containerization and managing application images through Docker Hub.
3. Deployed and managed applications on a multi-node Kubernetes (Kubeadm) cluster, understanding pod scheduling, networking, and orchestration.
4. Integrated SonarQube code quality analysis and Quality Gates to ensure only production-ready code gets deployed.
5. Learned Kubernetes Secrets and ConfigMaps for secure configuration and sensitive data management.
6.Developed strong troubleshooting and debugging skills by resolving real-world issues related to Jenkins, Kubernetes, Docker, networking, and deployments.


## ⚠️ What Can Go Wrong (Troubleshooting)
### 1. localhost:8080 connection refused
Symptom: Jenkins execution runs fail immediately during the CD Deploy stage.

Root Cause: Jenkins runs isolated as a child daemon tool inside a closed Docker engine environment. Lacking clear routing configurations to locate the master Control Plane API server, it falls back onto evaluating local execution points.

Solution: Exported updated administrative credentials from host layers directly into the container context:

```bash
docker cp ~/.kube/config jenkins:/root/.kube/config
```

### 2. CreateContainerConfigError On Secret Ingestion
Symptom: Kubernetes pods display structural failure flags, dropping continuously into terminal loops.

Root Cause: Standard text string conversions of crypto keys containing special characters (like literal \n identifiers) invalidate structural parsers once injected into flat key fields.

Solution: Formatted variables utilizing YAML structural multiline pipe indicators (|), structuring alignment properties cleanly.


### 3. Quality Gate Enforcer Timed Out Continuous Loops
Symptom: Automation tracks stall for up to 5 minutes at the execution stage before crashing completely.

Root Cause: Jenkins successfully schedules validation scans out toward SonarQube, but lacks return communication callbacks to close execution trackers.

Solution: Setup dedicated Webhooks within the SonarQube configuration dashboard pointing directly at:

```text
http://<TOOLS_SERVER_IP>:8080/sonarqube-webhook/
```

### 4. ImagePullBackOff Engine Denials
Symptom: Application pods show a permanent ImagePullBackOff block.

Root Cause: Target image registries configured under Private status models deny requests sent anonymously by worker nodes.

Solution: Modified visibility parameters on the target repository registry page via the Docker Hub dashboard to Public.

### 5. Jenkins to SonarQube IP Drift
Error: Failed to query server version: HTTP connect timed out

Solution: EC2 instance restarts changed the Public IPv4 addresses. Updated the Jenkins Global Configuration System URLs and SonarQube Webhook URLs to reflect the new EC2 Public IP strings.
