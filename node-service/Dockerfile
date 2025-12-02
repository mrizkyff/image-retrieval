FROM node:20-slim

ENV NODE_ENV=production \
    HF_HOME=/hf-cache

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

EXPOSE 3000

RUN node -e "const { pipeline } = require('@huggingface/transformers'); (async () => { await pipeline('image-feature-extraction','Xenova/clip-vit-base-patch32',{quantized:true}); console.log('Model cached'); })().catch(()=>{});"

CMD ["npm", "start"]
