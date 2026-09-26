// Reads the same window.CONFIG object that config.js sets.
// config.js is loaded as a <script> tag in index.html before the React app boots.
export const config = {
  get apiBase() {
    return window.CONFIG?.apiBase || '';
  },
  get cognitoClientId() {
    return window.CONFIG?.cognitoClientId || '';
  },
  get isConfigured() {
    return Boolean(
      this.apiBase &&
      this.apiBase.trim() !== '' &&
      this.cognitoClientId &&
      this.cognitoClientId.trim() !== ''
    );
  },
};
