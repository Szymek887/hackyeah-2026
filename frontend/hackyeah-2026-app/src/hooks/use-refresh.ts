import { useState } from 'react';

/**
 * Pull-to-refresh state. Own flag instead of `isRefetching`, so background polling
 * does not show the spinner.
 */
export function useRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh };
}
