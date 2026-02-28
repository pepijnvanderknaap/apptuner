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
      <View style={styles.header}>
        <Text style={styles.title}>AppTuner</Text>
        <Text style={styles.subtitle}>Recent Projects</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={item => item.projectId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onConnect(item.projectId)}
            activeOpacity={0.7}>
            <View style={styles.cardLeft}>
              <Text style={styles.projectName} numberOfLines={1}>
                {item.name || item.projectId}
              </Text>
              <Text style={styles.projectMeta} numberOfLines={1}>
                <Text style={styles.projectCode}>{item.projectId}</Text>
                {'  ·  '}
                {formatLastConnected(item.lastConnected)}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <View style={styles.connectBadge}>
                <Text style={styles.connectBadgeText}>Connect →</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                onPress={() => handleDelete(item.projectId)}>
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.scanButton} onPress={onScanNew}>
          <Text style={styles.scanButtonText}>+ Scan New Project</Text>
        </TouchableOpacity>
        <Text style={styles.shakeHint}>Shake to disconnect once connected</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#f2f2f7',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    color: '#86868b',
    fontWeight: '400',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 3,
  },
  projectMeta: {
    fontSize: 12,
    color: '#aeaeb2',
  },
  projectCode: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#aeaeb2',
  },
  connectBadge: {
    backgroundColor: '#007aff',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  connectBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 2,
  },
  deleteButtonText: {
    color: '#c7c7cc',
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scanButton: {
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#007aff',
    backgroundColor: '#ffffff',
  },
  scanButtonText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '600',
  },
  shakeHint: {
    fontSize: 13,
    color: '#aeaeb2',
    textAlign: 'center',
    marginBottom: 8,
  },
});
