import { View, StyleSheet } from "react-native";

interface SkeletonProps {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Reusable skeleton loader for loading states
 */
export function SkeletonLoader({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for obra card
 */
export function ObraCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width="60%" height={16} />
        <SkeletonLoader width="20%" height={16} />
      </View>
      <SkeletonLoader width="100%" height={6} style={styles.progressBar} />
      <View style={styles.cardFooter}>
        <SkeletonLoader width="30%" height={12} />
        <SkeletonLoader width="25%" height={12} />
      </View>
    </View>
  );
}

/**
 * Skeleton for list of items
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ObraCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
});
