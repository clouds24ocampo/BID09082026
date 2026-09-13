import React from 'react';
import { ProjectProfileView } from './ProjectProfileView';

export interface ProjectProfileProps {
  setActiveTab?: (tab: string) => void;
}

export const ProjectProfile: React.FC<ProjectProfileProps> = ({ setActiveTab = () => {} }) => {
  return <ProjectProfileView setActiveTab={setActiveTab} />;
};

export { ProjectProfileView };
export default ProjectProfile;
