/**
 * Recent Projects Screen
 *
 * Shows a list of previously connected projects.
 * Tap to reconnect without scanning QR again.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {RecentProject, removeProject} from '../services/storage';

interface Props {
  projects: RecentProject[];
  onConnect: (projectId: string) => void;
  onScanNew: () => void;
  onProjectsChanged: () => void;
}

export default function RecentProjects({
  projects,
  onConnect,
  onScanNew,
  onProjectsChanged,
}: Props) {
  const handleDelete = async (projectId: string) => {
    await removeProject(projectId);
    onProjectsChanged();
  };

  const formatLastConnected = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>AppTuner</Text>
        <Text style={styles.subtitle}>Recent Projects</Text>

        <FlatList
          data={projects}
          keyExtractor={item => item.projectId}
          style={styles.list}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.projectRow}
              onPress={() => onConnect(item.projectId)}
              activeOpacity={0.7}>
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{item.name || item.projectId}</Text>
                <Text style={styles.projectMeta}>
                  {item.projectId} · {formatLastConnected(item.lastConnected)}
                </Text>
              </View>
              <View style={styles.projectActions}>
                <View style={styles.connectBadge}>
                  <Text style={styles.connectBadgeText}>Connect →</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  onPress={() => handleDelete(item.projectId)}>
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <TouchableOpacity style={styles.scanButton} onPress={onScanNew}>
          <Text style={styles.scanButtonText}>+ Scan New Project</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#86868b',
    marginBottom: 32,
  },
  list: {
    flex: 1,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1d1d1f',
    marginBottom: 2,
  },
  projectMeta: {
    fontSize: 13,
    color: '#86868b',
    fontFamily: 'Courier',
  },
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectBadge: {
    backgroundColor: '#007aff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  connectBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    color: '#86868b',
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#f2f2f7',
  },
  scanButton: {
    marginVertical: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '500',
  },
});
