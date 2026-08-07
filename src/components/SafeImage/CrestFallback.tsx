// Small pairing for SafeImage: a colored-circle initials fallback for
// club crests / player photos. Shared by the fixtures/match-centre views
// so a second and third copy of this exact pattern don't appear alongside
// ResultCard.tsx's existing one.
import { initials } from '../../utils/initials';
import './CrestFallback.css';

function CrestFallback({ label }: { label: string }) {
  return <span className="crest-fallback">{initials(label)}</span>;
}

export default CrestFallback;
