import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getAppRepos, type AppRepos } from '../lib/db/repos';

const RepoContext = createContext<AppRepos | null>(null);

/**
 * Opens the SQLite database once at app startup and makes every repo
 * available to the screen tree via `useRepos()`. Renders a simple loading
 * spinner until the database is ready — this is the only "loading" state in
 * the app, since everything else works offline and instantly.
 */
export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [repos, setRepos] = useState<AppRepos | null>(null);

  useEffect(() => {
    let mounted = true;
    getAppRepos().then((loaded) => {
      if (mounted) setRepos(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!repos) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <RepoContext.Provider value={repos}>{children}</RepoContext.Provider>;
}

/** Accesses the app's SQLite-backed repos. Must be called from within `RepoProvider`. */
export function useRepos(): AppRepos {
  const repos = useContext(RepoContext);
  if (!repos) {
    throw new Error('useRepos() must be called within RepoProvider, after the database has loaded.');
  }
  return repos;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
