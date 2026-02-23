/**
 * Recent Projects Storage
 *
 * In-memory storage for recently connected projects.
 * Projects persist as long as the app is running (including backgrounded).
 * No native module required.
 */

export interface RecentProject {
  projectId: string;
  name: string;
  lastConnected: number;
}

const MAX_PROJECTS = 10;

// Module-level store — persists for the lifetime of the app process
let projectsStore: RecentProject[] = [];

export async function saveProject(project: RecentProject): Promise<void> {
  // Move to top if already in list, otherwise prepend
  projectsStore = [
    project,
    ...projectsStore.filter(p => p.projectId !== project.projectId),
  ].slice(0, MAX_PROJECTS);
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  return [...projectsStore];
}

export async function removeProject(projectId: string): Promise<void> {
  projectsStore = projectsStore.filter(p => p.projectId !== projectId);
}
