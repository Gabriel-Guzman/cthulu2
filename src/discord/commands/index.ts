import Level from './levels/level';
import Intro from './music/intro';
import Pause from './music/pause';
import Queue from './music/queue';
import Resume from './music/resume';
import Skip from './music/skip';
import Stop from './music/stop';
import List from './music/list';
import RemoveIntro from './music/removeIntro';

export default [Level, Intro, RemoveIntro, List];

export const clusterableCommands = [Pause, Queue, Resume, Skip, Stop];
