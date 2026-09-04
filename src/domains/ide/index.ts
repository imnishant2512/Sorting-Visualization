/*
 * Lazy entry point for the IDE domain.
 *
 * The router imports *this* module, never `IDEPage` directly, so that Monaco
 * and its workers land in their own chunk and the editor is configured before
 * the page mounts. Tests import `IDEPage` directly and so never pull Monaco
 * into jsdom.
 */
import './monacoSetup';
import { IDEPage } from './components/IDEPage';

export default IDEPage;
