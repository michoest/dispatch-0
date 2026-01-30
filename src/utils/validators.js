function validateTranscript(transcript) {
  return typeof transcript === 'string' && transcript.trim().length > 0;
}

function validateServiceRegistration(baseUrl, apiKey) {
  if (!baseUrl || typeof baseUrl !== 'string') return false;
  if (!apiKey || typeof apiKey !== 'string') return false;

  try {
    new URL(baseUrl);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  validateTranscript,
  validateServiceRegistration
};
