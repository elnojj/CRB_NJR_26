/** Reuse the existing Firebase sign-in; do not initialize another auth client. */
export async function getCerebroIdToken(): Promise<string | null> {
  const { getWorkspaceAuth } = await import('../../utils/googleWorkspaceAuth');
  const auth = getWorkspaceAuth();
  await auth.authStateReady();
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}
