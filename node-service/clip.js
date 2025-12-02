const { pipeline } = require('@huggingface/transformers');

let extractorPromise;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      'image-feature-extraction',
      'Xenova/clip-vit-base-patch32',
      { quantized: true }
    );
  }
  return extractorPromise;
}

module.exports = async function getImageEmbedding(buffer) {
  const extractor = await getExtractor();
  const result = await extractor(buffer, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
};
