## Overview

This is a paste-ready setup plan for a production ion server behind Ionirix.

It assumes:

- Remote GPU server or service running ion
- Ionirix talks to it via `ion_HOST` (HTTP) and `ion_WS` (WebSocket)
- Anime-optimized model(s) loaded on the server
- Nginx (or similar) as reverse proxy with HTTPS and WebSocket support

References:

- https://github.com/angusdowling/ion-Deployment
- https://deepwiki.com/ashleykleynhans/ion-docker/4.3-nginx-configuration

## 1. Target Architecture

Goal: one production ion backend, reachable from Ionirix as:

- `ion_HOST=https://img.ionirix.yourdomain.com`
- `ion_WS=wss://img.ionirix.yourdomain.com/ws`
- `ion_MOCK=false`

High-level components:

- GPU server: ion backend, models, custom nodes
- Reverse proxy: Nginx with HTTPS, WebSocket support, CORS, and long timeouts
- Ionirix backend: image generation route that talks to ion
- Ion: orchestrator that builds prompts and selects workflows

## 2. Server Provisioning

### 2.1 Hardware

- GPU: 24-80 GB VRAM (4090, A5000, A100, etc.)
- Disk: at least 500 GB SSD for models, LoRAs, outputs
- OS: Ubuntu 22.04 LTS or similar

### 2.2 Base Setup

- Install NVIDIA drivers and CUDA
- Install Docker and NVIDIA Container Toolkit if containerized
- Open ports:
  - `80` and `443` for Nginx
  - `8188` for internal ion only, not public

## 3. ion Deployment

This example uses Docker because it is easier to reason about and version.

### 3.1 Folder Layout On Server

```bash
/opt/ion/
  docker-compose.yml
  data/
    models/
    output/
    custom_nodes/
    workflows/
  nginx/
    nginx.conf
```

### 3.2 docker-compose.yml

```yaml
version: "3.9"

services:
  ion-backend:
    image: ghcr.io/Ionanonymous/ion:latest
    container_name: ion-backend
    restart: unless-stopped
    ports:
      - "8188:8188"
    environment:
      - PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
    volumes:
      - ./data/models:/root/ion/models
      - ./data/output:/root/ion/output
      - ./data/custom_nodes:/root/ion/custom_nodes
      - ./data/workflows:/root/ion/user/default/workflows
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: ["gpu"]

  nginx:
    image: nginx:stable
    container_name: ion-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

## 4. Nginx Reverse Proxy

### 4.1 nginx.conf

```nginx
worker_processes auto;

events {
  worker_connections 2048;
}

http {
  client_max_body_size 500M;

  upstream Ion_backend {
    server ion-backend:8188;
  }

  server {
    listen 80;
    listen [::]:80;
    server_name img.ionirix.yourdomain.com;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name img.ionirix.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/img.ionirix.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/img.ionirix.yourdomain.com/privkey.pem;

    add_header Access-Control-Allow-Origin "https://app.ionirix.yourdomain.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    if ($request_method = OPTIONS) {
      return 204;
    }

    location /ws {
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;

      proxy_read_timeout 600s;
      proxy_send_timeout 600s;

      proxy_pass http://Ion_backend/ws;
    }

    location / {
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      proxy_read_timeout 600s;
      proxy_send_timeout 600s;

      proxy_pass http://Ion_backend;
    }
  }
}
```

## 5. Models And Anime Stack

### 5.1 Model Placement

Checkpoints:

```bash
/opt/ion/data/models/checkpoints/
```

LoRAs:

```bash
/opt/ion/data/models/loras/
```

Examples to select from:

- Anime-tuned SDXL or SD 1.5 derivatives
- LoRAs for:
  - Niji-like
  - 90s cel
  - Seinen or gritty
  - Pastel shoujo

### 5.2 Custom Nodes

```bash
/opt/ion/data/custom_nodes/
```

Restart `ion-backend` after adding nodes or models.

## 6. Workflow And API Contract

### 6.1 Save Workflow In API Format

In the ion UI:

- Enable Development Mode
- Build the anime-optimized workflow
- Save in API format as `workflow_api.json`
- Store it in:

```bash
/opt/ion/data/workflows/anime_v1.json
```

### 6.2 Ionirix Backend To ion REST

Ionirix backend route:

```http
POST /image/generate
```

Example request:

```json
{
  "prompt": "cinematic niji-grade anime girl in neon city",
  "style": "anime_cinematic",
  "params": {
    "width": 832,
    "height": 1216,
    "steps": 28,
    "cfg": 3.5,
    "seed": 123456789
  },
  "metadata": {
    "user_id": "ion-user",
    "request_id": "uuid",
    "ion_reasoning": "<expanded prompt>"
  }
}
```

Backend steps:

1. Load `anime_v1.json` workflow.
2. Inject prompt text, negative prompt, width, height, steps, cfg, seed, and LoRA strength.
3. POST the modified graph to:

```http
POST https://img.ionirix.yourdomain.com/prompt
Content-Type: application/json
```

### 6.3 WebSocket Progress

Backend opens:

```text
wss://img.ionirix.yourdomain.com/ws
```

Expected flow:

- Subscribe to queue or job ID
- Stream progress events to Ionirix frontend
- Receive final image path(s)
- Download image(s) from ion `/view` or `/output`

## 7. Environment Variables On Ionirix Side

Example backend env:

```env
ion_HOST=https://img.ionirix.yourdomain.com
ion_WS=wss://img.ionirix.yourdomain.com/ws
ion_MOCK=false
ion_TIMEOUT_MS=600000
```

Example config module:

```ts
export const IonConfig = {
  host: process.env.ion_HOST!,
  ws: process.env.ion_WS!,
  mock: process.env.ion_MOCK === "true",
  timeoutMs: Number(process.env.ion_TIMEOUT_MS ?? 600000)
};
```

## 8. VS Code Implementation Plan

### 8.1 Repo Structure

```text
/backend/
  src/
    imageGen/
      ion/
        IonClient.ts
        IonWorkflowBuilder.ts
        IonTypes.ts
      ionImageService.ts
      routes/
        imageGenRoutes.ts
  .env

/docs/
  ion-production-server.md
  image-gen-architecture-v1.md

/frontend/
  src/
    features/imageGen/
      api.ts
      useImageJob.ts
      ImagePromptForm.tsx
      ImageProgress.tsx
      ImageGallery.tsx
```

### 8.2 Build Order

Step 1: server infra outside the repo.

- Provision GPU server
- Install Docker and NVIDIA toolkit
- Create `/opt/ion` structure
- Add `docker-compose.yml` and `nginx.conf`
- Run `docker compose up -d`
- Get TLS certs and reload Nginx

Step 2: ion workflows.

- Open ion UI at `https://img.ionirix.yourdomain.com`
- Build `anime_v1` workflow
- Save API format to `data/workflows/anime_v1.json`

Step 3: backend integration.

- Implement `IonClient.ts`
  - `submitWorkflow(graph): jobId`
  - `subscribeToJob(jobId): events`
  - `fetchResult(jobId): images`
- Implement `IonWorkflowBuilder.ts`
  - Load `anime_v1.json`
  - Inject prompt and params
- Implement `ionImageService.ts`
  - `generateImage(request)` to job ID
  - Poll or stream progress
- Implement `imageGenRoutes.ts`
  - `POST /image/generate`
  - `GET /image/job/:id`

Step 4: frontend.

- Prompt form with style presets
- Call `/image/generate`
- Subscribe to job progress with SSE or polling
- Show final image and metadata

Step 5: Ion orchestration.

- Infer style
- Expand prompt with anime tags
- Add negative prompt
- Choose workflow `anime_v1`
- Send structured request to `/image/generate`

## 9. Anime Style Presets

```ts
export const animeStyles = {
  anime_cinematic: {
    positiveTags: "cinematic lighting, detailed anime, sharp lineart, vibrant colors, depth of field",
    negativeTags: "blurry, lowres, extra limbs, distorted face, watermark, text"
  },
  pastel_shoujo: {
    positiveTags: "soft pastel colors, shoujo anime, sparkles, gentle lighting, big expressive eyes",
    negativeTags: "harsh shadows, gritty, horror, gore"
  },
  gritty_seinen: {
    positiveTags: "seinen anime, dramatic shadows, realistic anatomy, muted palette, urban grit",
    negativeTags: "kawaii, chibi, overly bright"
  },
  retro_90s: {
    positiveTags: "90s cel anime, film grain, limited palette, thick outlines, nostalgic",
    negativeTags: "hyperrealistic, 3d render, photoreal"
  }
};
```

Ion uses these presets when building the final prompt for ion.