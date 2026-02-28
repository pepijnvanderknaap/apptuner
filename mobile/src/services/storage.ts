/**
 * Recent Projects Storage
 *
 * Persists recently connected projects to AsyncStorage so they survive
 * force-quit and app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentProject {
  projectId: string;
  name: string;
  lastConnected: number;
}

const STORAGE_KEY = '@apptuner:recent_projects';
const MAX_PROJECTS = 10;

export async function saveProject(project: RecentProject): Promise<void> {
  const existing = await getRecentProjects();
  const updated = [
    project,
    ...existing.filter(p => p.projectId !== project.projectId),
  ].slice(0, MAX_PROJECTS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  console.log('[Storage] Saved project:', project.projectId, '— total:', updated.length);
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const projects = raw ? JSON.parse(raw) : [];
    console.log('[Storage] Loaded projects:', projects.length);
    return projects;
  } catch (e) {
    console.log('[Storage] Error loading projects:', e);
    return [];
  }
}

export async function removeProject(projectId: string): Promise<void> {
  const existing = await getRecentProjects();
  const updated = existing.filter(p => p.projectId !== projectId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
