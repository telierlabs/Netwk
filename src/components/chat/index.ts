// ─────────────────────────────────────────────
// INDEX — src/components/chat/index.ts
// Barrel exports for the entire ChatBubble system
// ─────────────────────────────────────────────

// Main component
export { ChatBubble } from './ChatBubble';

// Types
export type { ChatBubbleProps, Message, ActivityStatus } from './types';

// Sub-components (for direct use if needed)
export { LoadingDots, DiagramLoading, DiagramError } from './components/ui/Primitives';
export { DiagramLightbox } from './components/ui/DiagramLightbox';
export { DiagramWrapper } from './components/ui/DiagramWrapper';
export { CollapsibleUserBubble } from './components/ui/CollapsibleUserBubble';
export { UserBubble } from './components/ui/UserBubble';
export { ActionBar } from './components/ui/ActionBar';
export { SuggestionsRow } from './components/ui/SuggestionsRow';
export { ActivityBubble, AutoReminderBubble, FileLinkElement } from './components/ui/SpecialBubbles';

export { SmartImageGallery } from './components/media/SmartImageGallery';

export { MarkdownRenderer, StreamingText } from './components/renderers/MarkdownRenderer';
export { CodeBlock } from './components/renderers/CodeBlock';
export { HtmlPreview } from './components/renderers/HtmlPreview';
export { PresentationRenderer, DocumentRenderer } from './components/renderers/PresentationRenderer';
export { CopyCard } from './components/renderers/CopyCard';

export { DiagramBlock, MermaidDiagram } from './components/diagrams/DiagramBlock';
export {
  MindmapDiagram, FlowDiagram, TimelineDiagram,
  RadialDiagram, CompareDiagram, CycleDiagram,
} from './components/diagrams/DiagramShapes';

// Utils & constants
export { downloadDiagramAsPng, parseFileLink, parseReplyQuote } from './utils';
export { COLLAPSE_THRESHOLD, LANG_LABELS, ACTIVITY_MAP, lbBtnSt } from './constants';
