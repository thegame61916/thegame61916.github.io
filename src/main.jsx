import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Fuse from 'fuse.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card as BsCard, Badge, Button, ButtonGroup, Form, Navbar, Nav, Offcanvas, Tab, Tabs, Collapse } from 'react-bootstrap';
import { Search, ExternalLink, Mail, FileText, GraduationCap, Award, BookOpen, Users, Images, Briefcase, Home as HomeIcon, Newspaper, X, LayoutGrid, List, Download, PlayCircle, ChevronDown, Eye, Image as ImageIcon, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import site from './data/site.json';
import publications from './data/publications.json';
import generatedPublicationKeywords from './data/generated-publication-keywords.json';
import keywordConfig from './data/keyword-config.json';
import collaborators from './data/collaborators.json';
import projects from './data/projects.json';
import students from './data/students.json';
import teaching from './data/teaching.json';
import news from './data/news.json';
import awards from './data/awards.json';
import timeline from './data/timeline.json';
import talks from './data/talks.json';
import gallery from './data/gallery.json';
import hobbies from './data/hobbies.json';
import generatedMedia from './data/generated-media.json';
import homeMedia from './data/home-media.json';
import { byId, externalAttrs, hasValue, asset, prettyDate, unique } from './utils/helpers';
import './styles.css';

const people = byId(collaborators);
const pubMap = byId(publications);
const projectMap = byId(projects);
const navItems = [
  ['home', 'Home', HomeIcon], ['about', 'About', GraduationCap], ['research', 'Research', BookOpen],
  ['projects', 'Projects', Briefcase], ['publications', 'Publications', FileText], ['people', 'People', Users],
  ['teaching', 'Teaching', BookOpen], ['talks', 'Talks', PlayCircle], ['gallery', 'Gallery', Images], ['news', 'News', Newspaper], ['contact', 'Contact', Mail]
];

const ACRONYMS = new Set(['AI', 'ML', 'CT', 'MRI', 'TVCG', 'IEEE', 'VIS', 'PDF', 'UI', 'UX', 'DIC', 'TDA']);
const SMALL_WORDS = new Set(['of', 'and', 'for', 'in', 'via', 'with', 'to', 'the', 'on', 'using']);
const normalizeKeyword = (term = '') => String(term)
  .trim()
  .replace(/[_\s]+/g, ' ')
  .replace(/[.,;:()[\]{}]+$/g, '')
  .toLowerCase();
const excludedKeywords = new Set((keywordConfig.excludeKeywords || []).map(normalizeKeyword));
function titleKeyword(term = '') {
  const canonical = keywordConfig.aliases?.[normalizeKeyword(term)] || String(term).trim();
  return canonical.split(/(\s+|-)/).map((part, idx) => {
    const low = part.toLowerCase();
    const clean = part.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (!clean || /^\s+$/.test(part) || part === '-') return part;
    if (ACRONYMS.has(clean)) return clean;
    if (idx > 0 && SMALL_WORDS.has(low)) return low;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join('');
}
function cleanKeyword(term) {
  const key = normalizeKeyword(term);
  if (!key || key.length < 3 || excludedKeywords.has(key) || /^\d+$/.test(key)) return null;
  const canonical = keywordConfig.aliases?.[key] || key;
  const normalized = normalizeKeyword(canonical);
  if (excludedKeywords.has(normalized)) return null;
  return titleKeyword(canonical);
}
function isHiddenForPublication(pub, keyword, scope = 'all') {
  const key = normalizeKeyword(keyword);
  const globalHidden = [
    ...(keywordConfig.excludeKeywords || []),
    ...(scope === 'auto' ? (keywordConfig.excludeAutoKeywords || []) : []),
    ...(scope === 'filter' ? (keywordConfig.excludeFilterKeywords || []) : [])
  ].map(normalizeKeyword);
  const localHidden = [
    ...(pub.hiddenKeywords || []),
    ...(scope === 'filter' ? (pub.hiddenFilterKeywords || []) : []),
    ...(scope === 'auto' ? (pub.hiddenAutoKeywords || []) : [])
  ].map(normalizeKeyword);
  return new Set([...globalHidden, ...localHidden]).has(key);
}
function cleanKeywordForPublication(pub, term, scope = 'all') {
  const cleaned = cleanKeyword(term);
  if (!cleaned) return null;
  return isHiddenForPublication(pub, cleaned, scope) ? null : cleaned;
}
function pubKeywords(pub, { forFilter = false } = {}) {
  if (forFilter) return publicationFilterKeywords(pub);
  const autoAllowed = keywordConfig.includeAutoKeywordsInPublicationPages !== false;
  return unique([
      ...(pub.tags || []),
      ...(pub.autoKeywords || []),
      ...(autoAllowed ? (generatedPublicationKeywords[pub.id] || []) : [])
    ]
    .map(term => cleanKeywordForPublication(pub, term, 'all'))
    .filter(Boolean))
    .sort((a, b) => a.localeCompare(b));
}
function publicationFilterKeywords(pub) {
  const explicit = Array.isArray(pub.filterKeywords) && pub.filterKeywords.length > 0;
  const base = explicit ? pub.filterKeywords : (keywordConfig.useExplicitFilterKeywordsOnly ? [] : (pub.tags || []));
  const auto = keywordConfig.includeAutoKeywordsInFilters === true ? (generatedPublicationKeywords[pub.id] || []) : [];
  const merged = [...base, ...auto]
    .map(term => cleanKeywordForPublication(pub, term, 'filter'))
    .filter(Boolean);
  const max = Number(keywordConfig.maxFilterKeywordsPerPublication || 0);
  return unique(max > 0 ? merged.slice(0, max) : merged).sort((a, b) => a.localeCompare(b));
}
function primaryPubLink(pub) {
  return pub.localPdf || pub.pdf || pub.doi || '';
}
function materialSource(item = {}) {
  return String(item.path || item.url || '').trim();
}
function isPdfMaterial(item = {}) {
  const source = materialSource(item).toLowerCase();
  return String(item.type || '').toLowerCase() === 'pdf' || source.endsWith('.pdf');
}
function supplementaryItems(pub) {
  const supplements = (pub.supplements || []).map(item => ({
    ...item,
    label: isPdfMaterial(item) ? 'Supplementary PDF' : (item.label || 'Supplementary Material')
  }));
  const legacySource = hasValue(pub.supplement) ? String(pub.supplement).trim() : '';
  const hasExplicitLegacy = legacySource && supplements.some(item => materialSource(item) === legacySource);
  const legacy = legacySource && !hasExplicitLegacy
    ? [{ label: 'Supplementary PDF', type: 'pdf', url: pub.supplement, preview: true }]
    : [];
  return [...legacy, ...supplements];
}
function videoItems(pub) {
  const videos = pub.videos || (hasValue(pub.video) ? [{ url: pub.video, embed: true }] : []);
  return videos.map((item, index) => ({
    ...item,
    label: videos.length > 1 ? `Supplementary Video ${index + 1}` : 'Supplementary Video'
  }));
}
function publicationAwardItems(pub) {
  const items = [];
  if (hasValue(pub.award)) {
    items.push({
      label: pub.award,
      type: 'award',
      url: pub.awardUrl || '',
      path: pub.awardCertificate || '',
      preview: hasValue(pub.awardCertificate) || hasValue(pub.awardUrl),
      id: 'award-1'
    });
  }
  return [...items, ...(pub.awards || [])];
}
function displayAwardLabel(item) {
  const label = String(item?.label || item?.title || '').trim();
  const normalized = label.toLowerCase();
  if (!label) return '';
  if (/honou?rable mention/.test(normalized)) return 'Honorable Mention';
  if (/best.*poster|poster.*best/.test(normalized)) return 'Best Poster';
  if (/best.*paper|paper.*best/.test(normalized)) return 'Best Paper';
  return label.replace(/\s+certificate$/i, '').replace(/\s+award$/i, '');
}
function AwardBadges({ pub, className = '' }) {
  const labels = unique(publicationAwardItems(pub).map(displayAwardLabel).filter(Boolean));
  if (!labels.length) return null;
  return <div className={`award-badges ${className}`}>{labels.map(label => <Badge key={label} bg="warning" text="dark" className="award-badge">{label}</Badge>)}</div>;
}
function LinkButton({ href, children, variant = 'outline-primary', size = 'sm', download = false, className = '', onClick }) {
  if (!hasValue(href) && !onClick) return null;
  const linkHref = hasValue(href) ? href : undefined;
  const external = linkHref && String(linkHref).startsWith('http');
  return <Button as={linkHref ? 'a' : 'button'} size={size} variant={variant} className={`rounded-pill d-inline-flex align-items-center gap-1 ${className}`} href={linkHref} download={download || undefined} onClick={onClick} {...(external ? externalAttrs : {})}>{children}{external && <ExternalLink size={13} />}</Button>;
}
function Section({ title, eyebrow, children, aside }) {
  return <section className="section"><div className="section-title-row"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{aside}</div>{children}</section>;
}
function Tags({ tags = [], limit = 8 }) {
  const shown = limit ? tags.slice(0, limit) : tags;
  return <div className="tag-cloud">{shown.map(t => <Badge bg="light" text="dark" className="tag" key={t}>{t}</Badge>)}</div>;
}
function goRoute(route, setRoute) { location.hash = route; setRoute(route); }

function Header({ route, setRoute }) {
  const [show, setShow] = useState(false);
  const NavLinks = <>{navItems.map(([id, label, Icon]) => <Nav.Link key={id} href={`#${id}`} active={route === id || (id === 'gallery' && route.startsWith('gallery:'))} onClick={() => { setRoute(id); setShow(false); }}><Icon size={15}/>{label}</Nav.Link>)}</>;
  return <Navbar sticky="top" expand="xl" className="site-nav">
    <Container fluid="xxl">
      <Navbar.Brand href="#home" onClick={() => setRoute('home')} className="brand"><span className="brand-photo"><img src={asset(site.photo)} alt={`${site.name} profile`} /></span><span><strong>{site.name}</strong><small>{site.affiliation}</small></span></Navbar.Brand>
      <Navbar.Toggle aria-controls="main-nav" onClick={() => setShow(true)} />
      <Navbar.Collapse className="d-none d-xl-flex justify-content-end"><Nav className="nav-pills-soft">{NavLinks}</Nav></Navbar.Collapse>
      <Offcanvas show={show} onHide={() => setShow(false)} placement="end" className="mobile-menu"><Offcanvas.Header closeButton><Offcanvas.Title>{site.name}</Offcanvas.Title></Offcanvas.Header><Offcanvas.Body><Nav className="flex-column nav-pills-soft">{NavLinks}</Nav></Offcanvas.Body></Offcanvas>
    </Container>
  </Navbar>;
}
function GlobalSearch({ setRoute }) {
  const corpus = useMemo(() => [
    ...publications.map(x => ({ ...x, kind: 'Publication', route: `publication:${x.id}`, text: [x.title, x.authorText, x.venue, pubKeywords(x).join(' ')].join(' ') })),
    ...projects.map(x => ({ ...x, kind: 'Project', route: `project:${x.id}`, text: [x.title, x.short, x.description].join(' ') })),
    ...collaborators.map(x => ({ ...x, kind: 'Collaborator', route: 'people', text: [x.name, x.affiliation, x.area].join(' ') })),
    ...news.map(x => ({ ...x, kind: 'News', route: x.route || 'news', text: [x.title, x.description].join(' ') }))
  ], []);
  const fuse = useMemo(() => new Fuse(corpus, { keys: ['text', 'title', 'name'], threshold: .32 }), [corpus]);
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(null);
  const results = q.length > 1 ? fuse.search(q).slice(0, 7).map(r => r.item) : [];

  useEffect(() => {
    setActiveIndex(results.length ? 0 : -1);
  }, [q, results.length]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setQ('');
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  function selectResult(item) {
    if (!item) return;
    goRoute(item.route, setRoute);
    setQ('');
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (!results.length) {
      if (event.key === 'Escape') setQ('');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(i => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectResult(results[Math.max(activeIndex, 0)]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setQ('');
      setActiveIndex(-1);
    }
  }

  return <div className="global-search" ref={searchRef}><Search size={17}/><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKeyDown} placeholder="Search publications, projects, people…" role="combobox" aria-expanded={results.length > 0} aria-controls="global-search-results" aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined} />{results.length > 0 && <div className="search-panel" id="global-search-results" role="listbox">{results.map((r, index) => <button id={`global-search-result-${index}`} role="option" aria-selected={index === activeIndex} className={index === activeIndex ? 'active' : ''} key={`${r.kind}-${r.id || r.title}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => selectResult(r)}><span>{r.kind}</span><strong>{r.title || r.name}</strong></button>)}</div>}</div>;
}
function Stat({ value, label, route, setRoute }) { return <button className="stat" onClick={() => route && goRoute(route, setRoute)}><strong>{value}</strong><span>{label}</span></button>; }

function Home({ setRoute }) {
  const featured = [...publications].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 4);
  const themeCount = unique(projects.flatMap(p => p.themes || p.tags || [p.id])).length || projects.length;
  return <>
    <section className="hero-grid">
      <div className="hero-copy"><div className="eyebrow">{site.title} · {site.affiliation}</div><h1>{site.name}</h1><p className="tagline">{site.tagline}</p><p className="lead mb-3">{site.bioShort}</p><div className="hero-actions"><LinkButton href="#publications" variant="primary">Publications</LinkButton><LinkButton href={site.cv}>Download CV</LinkButton><LinkButton href={site.links['Google Scholar']}>Google Scholar</LinkButton><LinkButton href={site.links.LinkedIn}>LinkedIn</LinkButton><LinkButton href={`mailto:${site.emails[0]}`}>Contact</LinkButton></div></div>
      <div className="profile-panel"><img src={asset(site.photo)} alt={`${site.name} profile`} /><h3>{site.name}</h3><p>{site.title}</p><small>Linköping University, Sweden</small><div className="stats-row two"><Stat value={publications.length} label="publications" route="publications" setRoute={setRoute}/><Stat value={themeCount} label="research themes" route="research" setRoute={setRoute}/></div></div>
    </section>
    <Row className="g-4 mt-1 home-lower"><Col xl={8}><Section title="Recent Publications" aside={<Button variant="link" size="sm" onClick={() => goRoute('publications', setRoute)}>View all</Button>}><div className="home-publications pub-list">{featured.map(p => <PublicationCard key={p.id} pub={p} setRoute={setRoute} list />)}</div></Section></Col><Col xl={4} className="home-side-column"><Section title="News"><ScrollableNews setRoute={setRoute}/></Section><HomeMediaHighlight setRoute={setRoute}/></Col></Row>
  </>;
}
function ScrollableNews({ setRoute }) {
  const [visible, setVisible] = useState(Math.min(5, news.length));
  function onScroll(e) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) setVisible(v => Math.min(news.length, v + 4));
  }
  return <div className="scroll-news home-news-scroll" onScroll={onScroll}>{news.slice(0, visible).map(n => <NewsCard item={n} key={n.date + n.title} setRoute={setRoute} compact />)}</div>;
}

function HomeMediaHighlight({ setRoute }) {
  const items = useMemo(() => {
    const isCreativeMedia = (item) => ['poetry', 'theatre', 'theater'].includes(normalizeKeyword(item.category));
    return buildUnifiedMedia()
      .filter(item => normalizeMediaType(item) === 'image' && !isCreativeMedia(item))
      .map(item => ({
        id: item.id,
        type: 'image',
        title: item.title,
        caption: item.description || item.caption || item.title,
        subcaption: item.description || item.caption || '',
        image: item.src,
        alt: item.title,
        link: `#gallery:${item.id}`,
        linkText: 'Open in gallery'
      }));
  }, []);
  if (homeMedia.enabled === false || items.length === 0) return null;
  const defaultItem = items.find(item => item.id === homeMedia.defaultItemId) || items[0];
  const [activeId, setActiveId] = useState(defaultItem.id || items[0].id);
  const [slideDirection, setSlideDirection] = useState('next');
  const [slideMode, setSlideMode] = useState('manual');
  const [previousSlide, setPreviousSlide] = useState(null);
  const active = items.find(item => item.id === activeId) || defaultItem;
  const activeIndex = Math.max(0, items.findIndex(item => item.id === active.id));
  const setSlide = (id, direction = 'next', mode = 'manual') => {
    if (id === active.id) return;
    setPreviousSlide(active);
    setSlideDirection(direction);
    setSlideMode(mode);
    setActiveId(id);
  };
  const showPrevious = (event) => {
    event.stopPropagation();
    setSlide(items[(activeIndex - 1 + items.length) % items.length].id, 'prev');
  };
  const showNext = (event) => {
    event.stopPropagation();
    setSlide(items[(activeIndex + 1) % items.length].id, 'next');
  };
  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveId(current => {
        const index = items.findIndex(item => item.id === current);
        const previous = items[index >= 0 ? index : 0];
        if (previous) setPreviousSlide(previous);
        setSlideDirection('next');
        setSlideMode('auto');
        return items[(index + 1) % items.length].id;
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [items]);
  const openTarget = () => {
    if (!hasValue(active.link)) return;
    if (String(active.link).startsWith('#')) goRoute(String(active.link).replace('#', ''), setRoute);
    else window.open(active.link, '_blank', 'noopener,noreferrer');
  };
  return <div className="home-media-block" aria-label={homeMedia.title || 'Homepage media highlight'}>
    <div className="home-media-card">
      <div className="home-media-carousel" onClick={openTarget}>
        <div className={`home-media-track ${previousSlide ? `home-media-track-${slideDirection} home-media-track-${slideMode}` : 'home-media-track-single'}`} key={`${previousSlide?.id || 'start'}-${active.id}`} onAnimationEnd={() => setPreviousSlide(null)}>
          {previousSlide && <div className="home-media-slide"><HomeMediaPreview item={previousSlide}/></div>}
          <div className="home-media-slide"><HomeMediaPreview item={active}/></div>
        </div>
        {items.length > 1 && <>
          <button className="home-media-nav home-media-nav-prev" aria-label="Previous gallery image" onClick={showPrevious}><ChevronLeft size={18}/></button>
          <button className="home-media-nav home-media-nav-next" aria-label="Next gallery image" onClick={showNext}><ChevronRight size={18}/></button>
        </>}
        {(active.title || active.caption || hasValue(active.link)) && <div className="home-media-body home-media-overlay">
          {active.title && <h3>{active.title}</h3>}
          {active.subcaption && <p>{active.subcaption}</p>}
          {hasValue(active.link) && <Button size="sm" variant="light" className="rounded-pill" onClick={(event) => { event.stopPropagation(); openTarget(); }}>{active.linkText || 'Open related item'}</Button>}
        </div>}
      </div>
    </div>
  </div>;
}
function toYouTubeEmbed(url = '', autoplay = false) {
  const text = String(url);
  let id = '';
  const watch = text.match(/[?&]v=([^&]+)/);
  const short = text.match(/youtu\.be\/([^?&]+)/);
  const embed = text.match(/youtube\.com\/embed\/([^?&]+)/);
  id = (watch?.[1] || short?.[1] || embed?.[1] || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return text;
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (autoplay) { params.set('autoplay', '1'); params.set('mute', '1'); params.set('playsinline', '1'); }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
function HomeMediaPreview({ item }) {
  const [inView, setInView] = useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [item?.id]);
  if (!item) return null;
  const type = item.type || (item.video || item.url ? 'video' : 'image');
  const src = item.image || item.path || item.video || item.url || '';
  if (type === 'youtube') {
    const embedUrl = toYouTubeEmbed(item.url || item.video, item.autoplayMuted && inView);
    return <div className="home-media-preview" ref={ref}><iframe title={item.title || 'YouTube media highlight'} src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; compute-pressure" allowFullScreen loading="lazy" /></div>;
  }
  if (type === 'video') {
    return <div className="home-media-preview" ref={ref}><video src={asset(src)} poster={item.poster ? asset(item.poster) : undefined} muted={item.muted !== false} autoPlay={item.autoplayMuted !== false && inView} loop={item.loop !== false} playsInline controls={item.controls === true} preload="metadata" /></div>;
  }
  return <div className="home-media-preview image" ref={ref}><img src={asset(src)} alt={item.alt || item.title || item.caption || 'Homepage media highlight'} loading="lazy" /></div>;
}
function newsTarget(n) {
  if (n.route) return { route: n.route };
  const link = (n.links || [])[0]?.url || '';
  return link ? { url: link } : { route: 'news' };
}
function NewsCard({ item, setRoute, compact = false }) {
  const target = newsTarget(item);
  const handle = () => target.route ? goRoute(target.route, setRoute) : window.open(target.url, '_blank', 'noopener,noreferrer');
  return <button className={`news-card ${compact ? 'compact' : ''}`} onClick={handle}><time>{prettyDate(item.date)}</time><strong>{item.title}</strong><p>{item.description}</p></button>;
}
function About() { return <><Section title="Biography"><div className="prose"><p>{site.bioLong}</p><p>My long-term research program is centered on topology-driven visual analytics for large-scale scientific data, connecting computational topology with practical analysis workflows for complex multivariate and time-varying datasets.</p></div><Tags tags={site.researchInterests} limit={0}/></Section><Section title="Education & Experience"><div className="timeline">{timeline.map(t => <div className="timeline-item" key={t.year + t.title}><span>{t.year}</span><div><h3>{t.title}</h3><p>{t.place}</p></div></div>)}</div></Section><AwardsSection/><Section title="Academic Service"><BsCard><BsCard.Body>Reviewer for IEEE VIS and ACM/IEEE Supercomputing Conference (SC). Vice Chair, ACM Student Chapter, IISc Bangalore.</BsCard.Body></BsCard></Section></>; }
function AwardsSection() {
  const paperAwards = publications.filter(p => p.award).map(p => ({ title: p.award, organization: p.venue, year: p.year, description: p.title, publicationId: p.id }));
  const merged = [...paperAwards, ...awards];
  const deduped = Object.values(merged.reduce((acc, item) => {
    const key = `${String(item.title || '').trim().toLowerCase()}::${String(item.year || '').trim()}`;
    const prev = acc[key];
    if (!prev) {
      acc[key] = item;
      return acc;
    }
    const prevDescLen = String(prev.description || '').trim().length;
    const nextDescLen = String(item.description || '').trim().length;
    // Keep the richer entry when duplicates exist (typically the curated JSON item).
    if (nextDescLen > prevDescLen) acc[key] = item;
    return acc;
  }, {}));
  return <Section title="Awards and Recognitions"><Row className="g-3">{deduped.map((a, idx) => <Col md={6} xl={4} key={`${a.title}-${idx}`}><button className="award-card card h-100" onClick={() => a.publicationId && (location.hash = `publication:${a.publicationId}`)}><BsCard.Body><Award size={18}/><h3>{a.title}</h3><p>{a.organization} · {a.year}</p><small>{a.description}</small></BsCard.Body></button></Col>)}</Row></Section>;
}
function ViewSwitch({ view, setView }) {
  return <ButtonGroup aria-label="Switch view"><Button variant={view === 'list' ? 'primary' : 'outline-primary'} onClick={() => setView('list')}><List size={16}/></Button><Button variant={view === 'grid' ? 'primary' : 'outline-primary'} onClick={() => setView('grid')}><LayoutGrid size={16}/></Button></ButtonGroup>;
}
function Research({ setRoute }) {
  const themes = deriveThemes();
  const [view, setView] = useState('grid');
  return <><Section title="Research Overview"><Row className="g-4 align-items-stretch"><Col lg={7}><BsCard className="h-100 soft-card"><BsCard.Body><p className="lead">My research develops computational and visual methods for extracting, simplifying, and interpreting structures in complex scientific datasets.</p></BsCard.Body></BsCard></Col><Col lg={5}><BsCard className="h-100"><BsCard.Body><h3>Future directions</h3><p>Scalable multivariate topology, interactive visual analytics, topology for time-varying data, and topology-assisted machine learning interpretability.</p></BsCard.Body></BsCard></Col></Row></Section><Section title="Research Themes" aside={<ViewSwitch view={view} setView={setView}/>}>{view === 'grid' ? <Row className="g-3">{themes.map(t => <Col md={6} xl={4} key={t.id}><ThemeCard theme={t} setRoute={setRoute}/></Col>)}</Row> : <div className="theme-list">{themes.map(t => <ThemeCard key={t.id} theme={t} setRoute={setRoute} list />)}</div>}</Section></>;
}
function deriveThemes() {
  const defaultThemes = [
    { id: 'multivariate-topology', title: 'Multivariate Topology', description: 'Reeb spaces, Jacobi sets, fiber surfaces, and scalable representations for bivariate and multifield data.' },
    { id: 'scientific-applications', title: 'Scientific Applications', description: 'Topology-driven analysis of chemistry, medical imaging, climate science, and simulation datasets.' },
    { id: 'time-varying-data', title: 'Time-Varying Data', description: 'Tracking, simplifying, and summarizing evolving features in scalar and multivariate fields.' },
    { id: 'visual-analytics-ai', title: 'Visual Analytics and AI', description: 'Interactive systems and topology-based descriptors for interpretable analysis and machine learning workflows.', status: 'Future ambition' }
  ];
  const themeImageCandidates = {
    'multivariate-topology': ['/assets/teasers/theme-multivariate-topology.png'],
    'scientific-applications': ['/assets/teasers/theme-scientific-applications.png.png', '/assets/teasers/theme-scientific-applications.png'],
    'time-varying-data': ['/assets/teasers/theme-time-varying-data.png'],
    'visual-analytics-ai': ['/assets/teasers/theme-visual-analytics-ai.png']
  };
  const themeSeedPublications = {
    'multivariate-topology': [
      'fiber-surface-2022',
      'jacobi-simplification-2024',
      'volume-fusion-2025',
      'spectral-ct-vcbm-poster-2025'
    ]
  };
  return defaultThemes.map(t => {
    if (t.status === 'Future ambition') {
      const image = (themeImageCandidates[t.id] || [])[0] || '';
      return { ...t, publications: [], projects: [], image };
    }
    const seededPubIds = themeSeedPublications[t.id] || [];
    const seededPubs = seededPubIds.map(id => pubMap[id]).filter(Boolean);
    const matchedPubs = publications.filter(p => pubKeywords(p).some(k => normalizeKeyword(k).includes(t.id.split('-')[0])) || (p.themes || []).includes(t.id) || (p.projects || []).some(pid => (projectMap[pid]?.themes || []).includes(t.id)));
    const pubs = unique([...seededPubs, ...matchedPubs].map(p => p.id)).map(id => pubMap[id]).filter(Boolean);
    const projs = projects.filter(p => (p.themes || []).includes(t.id) || (p.publications || []).some(pid => pubs.some(x => x.id === pid)));
    const image = (themeImageCandidates[t.id] || [])[0] || projs.find(p => p.image)?.image || pubs.find(p => p.thumbnail)?.thumbnail || '';
    return { ...t, publications: pubs, projects: projs, image };
  });
}
function ThemeCard({ theme, setRoute, list = false }) {
  const [open, setOpen] = useState(false);
  return <BsCard className={`theme-card h-100 ${list ? 'theme-card-list' : ''}`}>{theme.image && <div className="theme-thumb"><img src={asset(theme.image)} alt={`${theme.title} teaser`} loading="lazy"/></div>}<BsCard.Body>{theme.status && <Badge bg="warning" text="dark" className="mb-2">{theme.status}</Badge>}<h3>{theme.title}</h3><p>{theme.description}</p><div className="summary-pills"><button onClick={() => goRoute('publications', setRoute)}>{theme.publications.length} publications</button><button onClick={() => goRoute('projects', setRoute)}>{theme.projects.length} projects</button></div><Button variant="link" size="sm" className="p-0 mt-2" onClick={() => setOpen(!open)}>Show related items <ChevronDown size={14}/></Button><Collapse in={open}><div className="compact-related mt-2">{theme.publications.slice(0, 6).map(p => <button key={p.id} onClick={() => goRoute(`publication:${p.id}`, setRoute)}>{p.title}</button>)}</div></Collapse></BsCard.Body></BsCard>;
}
function Projects({ setRoute }) {
  const [view, setView] = useState('grid');
  return <Section title="Projects" aside={<ViewSwitch view={view} setView={setView}/>}>{view === 'grid' ? <Row className="g-3">{projects.map(p => <Col md={6} xl={4} key={p.id}><ProjectCard project={p} setRoute={setRoute}/></Col>)}</Row> : <div className="project-list">{projects.map(p => <ProjectCard key={p.id} project={p} setRoute={setRoute} list />)}</div>}</Section>;
}
function ProjectCard({ project: p, setRoute, list = false }) {
  return <BsCard role="button" tabIndex={0} className={`project-card h-100 ${list ? 'project-card-list' : ''}`} onClick={() => goRoute(`project:${p.id}`, setRoute)} onKeyDown={(e) => { if (e.key === 'Enter') goRoute(`project:${p.id}`, setRoute); }}><div className="project-thumb"><img src={asset(p.image)} alt={p.title} loading="lazy"/></div><BsCard.Body><Badge bg="light" text="dark" className="mb-2">{p.status}</Badge><h3>{p.title}</h3><p>{p.short}</p><div className="summary-pills"><span>{p.publications?.length || 0} publications</span><span>{p.collaborators?.length || 0} people</span></div><div className="card-actions mt-2"><Button size="sm" className="rounded-pill" onClick={(e) => { e.stopPropagation(); goRoute(`project:${p.id}`, setRoute); }}>Open project</Button></div></BsCard.Body></BsCard>;
}
function ProjectPage({ id, setRoute }) { const p = projectMap[id]; if (!p) return <NotFound/>; return <Section title={p.title} eyebrow={p.status}><Row className="g-4"><Col lg={5}><div className="project-detail-image-frame"><img className="wide-image project-detail-image" src={asset(p.image)} alt={p.title}/></div></Col><Col lg={7}><p className="lead">{p.short}</p><p>{p.description}</p><div className="card-actions"><LinkButton href={p.links?.code}>Code</LinkButton><LinkButton href={p.links?.data}>Data</LinkButton></div></Col></Row><RelatedPublications ids={p.publications} setRoute={setRoute}/><h3 className="mt-4">Collaborators</h3><PeopleStrip ids={p.collaborators}/></Section>; }
function RelatedPublications({ ids = [], setRoute }) { const pubs = ids.map(id => pubMap[id]).filter(Boolean); if (!pubs.length) return null; return <div className="mt-4"><h3>Related publications</h3><div className="compact-related">{pubs.map(p => <button key={p.id} onClick={() => goRoute(`publication:${p.id}`, setRoute)}><span>{p.year}</span>{p.title}</button>)}</div></div>; }
function Publications({ setRoute }) {
  const [q, setQ] = useState('');
  const [year, setYear] = useState('All');
  const [type, setType] = useState('All');
  const [kw, setKw] = useState('All');
  const [view, setView] = useState('list');
  const years = ['All', ...unique(publications.map(p => p.year)).sort((a, b) => b - a)];
  const types = ['All', ...unique(publications.map(p => p.type || p.category)).sort()];
  const keywordCounts = publications.reduce((acc, p) => { publicationFilterKeywords(p).forEach(k => acc[k] = (acc[k] || 0) + 1); return acc; }, {});
  const keywords = ['All', ...Object.keys(keywordCounts).sort((a, b) => a.localeCompare(b))];
  const filtered = publications.filter(p => {
    const text = [p.title, p.authorText, p.venue, p.year, pubKeywords(p).join(' ')].join(' ').toLowerCase();
    return (!q || text.includes(q.toLowerCase())) && (year === 'All' || String(p.year) === String(year)) && (type === 'All' || p.type === type || p.category === type) && (kw === 'All' || publicationFilterKeywords(p).includes(kw));
  });
  return <Section title="Publications"><div className="filters-bar publication-filters"><Form.Control placeholder="Search title, author, venue, keyword" value={q} onChange={e => setQ(e.target.value)} /><Form.Select value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</Form.Select><Form.Select value={type} onChange={e => setType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</Form.Select><Form.Select value={kw} onChange={e => setKw(e.target.value)}>{keywords.map(k => <option key={k} value={k}>{k === 'All' ? 'All keywords' : `${k} (${keywordCounts[k] || ''})`}</option>)}</Form.Select><ButtonGroup><Button variant={view === 'list' ? 'primary' : 'outline-primary'} onClick={() => setView('list')}><List size={16}/></Button><Button variant={view === 'grid' ? 'primary' : 'outline-primary'} onClick={() => setView('grid')}><LayoutGrid size={16}/></Button></ButtonGroup></div><div className={view === 'grid' ? 'pub-grid' : 'pub-list'}>{filtered.map(p => <PublicationCard key={p.id} pub={p} setRoute={setRoute} list={view === 'list'}/>)}</div></Section>;
}
function PublicationCard({ pub, setRoute, list = false }) {
  const kws = pubKeywords(pub, { forFilter: true });
  const links = <div className="card-actions pub-topline-links"><Button size="sm" className="rounded-pill" onClick={(e) => { e.stopPropagation(); goRoute(`publication:${pub.id}`, setRoute); }}>Details</Button><LinkButton href={primaryPubLink(pub)} onClick={(e) => e?.stopPropagation?.()}>PDF</LinkButton><LinkButton href={pub.doi} onClick={(e) => e?.stopPropagation?.()}>DOI</LinkButton></div>;
  return <div role="button" tabIndex={0} className={`pub-card card h-100 ${list ? 'pub-card-list' : ''}`} onClick={() => goRoute(`publication:${pub.id}`, setRoute)} onKeyDown={(e) => { if (e.key === 'Enter') goRoute(`publication:${pub.id}`, setRoute); }}>
    <div className="pub-thumb" style={{ '--pub-teaser-image': `url("${asset(pub.thumbnail)}")`, '--pub-teaser-focus': pub.thumbnailFocus || pub.teaserFocus || '50% 50%' }}><img src={asset(pub.thumbnail)} alt={`${pub.title} thumbnail`} loading="lazy"/></div>
    <BsCard.Body>
      <div className="pub-topline"><span className="pub-meta">{pub.type} · {pub.year}</span><div className="pub-topline-right"><AwardBadges pub={pub}/>{links}</div></div>
      <h3>{pub.title}</h3>
      <p className="authors">{pub.authorText}</p>
      <p><em>{pub.venue}</em></p>
      <Tags tags={kws} limit={list ? 12 : 8}/>
    </BsCard.Body>
  </div>;
}
function HomePublicationCard({ pub, setRoute }) {
  const kws = pubKeywords(pub, { forFilter: true }).slice(0, 4);
  const stop = (e) => e.stopPropagation();
  return <article
    role="button"
    tabIndex={0}
    className="home-pub-card home-pub-list-card"
    onClick={() => goRoute(`publication:${pub.id}`, setRoute)}
    onKeyDown={(e) => { if (e.key === 'Enter') goRoute(`publication:${pub.id}`, setRoute); }}
  >
    <div className="home-pub-thumb" style={{ '--pub-teaser-image': `url("${asset(pub.thumbnail)}")`, '--pub-teaser-focus': pub.thumbnailFocus || pub.teaserFocus || '50% 50%' }}><img src={asset(pub.thumbnail)} alt={`${pub.title} thumbnail`} loading="lazy"/></div>
    <div className="home-pub-body">
      <div className="home-pub-topline"><span className="pub-meta">{pub.type} · {pub.year}</span><AwardBadges pub={pub}/></div>
      <h3>{pub.title}</h3>
      <p className="home-pub-authors">{pub.authorText}</p>
      <p className="home-pub-venue"><em>{pub.venue}</em></p>
      <div className="home-pub-footer">
        <div className="tag-cloud compact-tags">{kws.map(t => <Badge bg="light" text="dark" className="tag" key={t}>{t}</Badge>)}</div>
        <div className="home-pub-links" onClick={stop}>
          <Button size="sm" variant="primary" className="rounded-pill" onClick={() => goRoute(`publication:${pub.id}`, setRoute)}>Details</Button>
          <LinkButton href={primaryPubLink(pub)}>PDF</LinkButton>
          <LinkButton href={pub.doi}>DOI</LinkButton>
          {videoItems(pub).slice(0,1).map((v, i) => <LinkButton key={`hv-${i}`} href={v.url}>Video</LinkButton>)}
          {hasValue(pub.code) && <LinkButton href={pub.code}>Code</LinkButton>}
        </div>
      </div>
    </div>
  </article>;
}
function PublicationPage({ id, setRoute }) {
  const p = pubMap[id];
  if (!p) return <NotFound/>;
  const keywords = pubKeywords(p);
  const preview = p.localPdf || p.pdf;
  const supplements = supplementaryItems(p);
  const videos = videoItems(p);
  const certs = publicationAwardItems(p);
  const previewItems = buildPreviewItems(p, preview, supplements, videos, certs);
  const defaultPreviewId = defaultPublicationPreviewId(previewItems, p);
  const [selectedPreviewId, setSelectedPreviewId] = useState(defaultPreviewId);
  React.useEffect(() => setSelectedPreviewId(defaultPreviewId), [defaultPreviewId]);
  const selectedPreview = previewItems.find(item => item.id === selectedPreviewId) || previewItems[0];

  return <Section title={p.title} eyebrow={`${p.venue} · ${p.year}`}>
    <Row className="g-4 align-items-start publication-detail-head">
      <Col lg={4} xl={3}>
        <div className="publication-teaser-wrap" style={{ '--pub-teaser-image': `url("${asset(p.thumbnail)}")`, '--pub-teaser-focus': p.thumbnailFocus || p.teaserFocus || '50% 50%' }}><img className="publication-teaser" src={asset(p.thumbnail)} alt={`${p.title} teaser`} /></div>
        <div className="card-actions mt-3"><LinkButton href={preview} variant="primary">Download PDF</LinkButton>{supplements.slice(0,2).map((s,i)=><LinkButton key={i} href={s.path || s.url}>{s.label || 'Supplement'}</LinkButton>)}{certs.slice(0,2).map((c,i)=><LinkButton key={`cert-${i}`} href={c.path || c.url}>{c.label || c.title || `Certificate ${i+1}`}</LinkButton>)}<LinkButton href={p.doi}>DOI</LinkButton></div>
      </Col>
      <Col lg={8} xl={9}>
        <p className="authors fs-6">{p.authorText}</p>
        <AwardBadges pub={p} className="mb-2"/><Tags tags={keywords} limit={0}/>
        <h3 className="mt-4">Abstract</h3>
        <p className="lead">{p.abstract}</p>
        <h3>Authors</h3>
        <PeopleStrip ids={p.authors}/>
      </Col>
    </Row>
    <Tabs defaultActiveKey="preview" className="mt-4">
      <Tab eventKey="preview" title="Preview">
        <div className="preview-browser">
          {previewItems.length > 1 && <div className="preview-toolbar"><Form.Label className="mb-0"><Eye size={16}/> Preview material</Form.Label><Form.Select value={selectedPreview?.id || ''} onChange={e => setSelectedPreviewId(e.target.value)}>{previewItems.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</Form.Select></div>}
          {selectedPreview ? <PreviewItem item={selectedPreview}/> : <p className="muted mt-3">No previewable material available.</p>}
        </div>
      </Tab>
      <Tab eventKey="materials" title="Materials"><div className="p-3"><h3>PDF, supplementary material, videos, code and data</h3><div className="material-list"><LinkButton href={preview} variant="primary">PDF</LinkButton>{supplements.map((s,i)=><LinkButton key={i} href={s.path || s.url}>{s.label || `Supplement ${i+1}`}</LinkButton>)}{videos.map((v,i)=><LinkButton key={i} href={v.url || v.path}>{v.label || `Video ${i+1}`}</LinkButton>)}{certs.map((c,i)=><LinkButton key={`cert-${i}`} href={c.path || c.url}>{c.label || c.title || `Certificate ${i+1}`}</LinkButton>)}{(p.links || []).map((l,i)=><LinkButton key={i} href={l.url}>{l.label}</LinkButton>)}</div></div></Tab>
      <Tab eventKey="bibtex" title="BibTeX"><pre className="bibtex">{p.bibtex}</pre></Tab>
      <Tab eventKey="related" title="Related">{p.projects?.length > 0 && <div className="p-3"><h3>Related projects</h3><div className="mini-links">{p.projects.map(pid => <button key={pid} onClick={() => goRoute(`project:${pid}`, setRoute)}>{projectMap[pid]?.title}</button>)}</div></div>}</Tab>
    </Tabs>
  </Section>;
}
function defaultPublicationPreviewId(items, pub) {
  if (items.some(item => item.id === 'paper')) return 'paper';
  const configured = pub.defaultPreview || pub.defaultPreviewId;
  if (configured && items.some(item => item.id === configured)) return configured;
  return items[0]?.id || '';
}
function primaryPreviewLabel(pub) {
  if (pub.previewLabel) return String(pub.previewLabel).replace(/\s+pdf$/i, '').trim();
  const type = `${pub.type || ''} ${pub.venue || ''}`.toLowerCase();
  if (type.includes('poster')) {
    if (type.includes('extended abstract')) return 'Extended Abstract';
    return 'Poster';
  }
  return 'Paper';
}
function buildPreviewItems(pub, pdf, supplements = [], videos = [], certificates = []) {
  const items = [];
  if (pdf) items.push({ id: 'paper', label: primaryPreviewLabel(pub), type: 'pdf', src: pdf });
  supplements.forEach((s, i) => {
    const src = s.path || s.url;
    if (src && s.preview !== false) items.push({ id: s.id || `supplement-${i + 1}`, label: s.label || `Supplement ${i + 1}`, type: s.type || 'pdf', src });
  });
  videos.forEach((v, i) => {
    const src = v.embedUrl || v.url || v.path;
    if (src && v.preview !== false) items.push({ id: v.id || `video-${i + 1}`, label: v.label || `Video ${i + 1}`, type: 'video', src });
  });
  certificates.forEach((c, i) => {
    const src = c.path || c.url;
    if (src && c.preview !== false) items.push({ id: c.id || `certificate-${i + 1}`, label: c.label || c.title || `Certificate ${i + 1}`, type: c.type || 'pdf', src });
  });
  return items;
}
function PreviewItem({ item }) {
  if (!item?.src) return null;
  const src = item.type === 'video' ? youtubeEmbed(item.src) : item.src;
  const isVideo = item.type === 'video' || String(src).includes('youtube.com/embed') || String(src).includes('vimeo.com');
  return <div className="preview-frame-wrap">{isVideo ? <iframe className="material-frame" src={src} title={item.label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure" allowFullScreen/> : <iframe className="material-frame" src={src} title={item.label} loading="lazy"/>}</div>;
}
function PreviewMedia({ videos = [], supplements = [] }) {
  const previewVideo = videos.find(v => v.preview);
  const previewSupp = supplements.find(s => s.preview);
  if (!previewVideo && !previewSupp) return null;
  const src = previewVideo?.embedUrl || previewVideo?.url || previewVideo?.path || previewSupp?.path || previewSupp?.url;
  const title = previewVideo?.label || previewSupp?.label || 'Supplementary preview';
  if (!src) return null;
  const isYouTube = String(src).includes('youtube.com') || String(src).includes('youtu.be');
  return <div className="supp-preview"><h3>{title}</h3>{isYouTube ? <iframe src={youtubeEmbed(src)} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure" allowFullScreen/> : <iframe src={src} title={title}/>}</div>;
}
function youtubeEmbed(url) { try { const u = new URL(url); const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v'); return id ? `https://www.youtube.com/embed/${id}` : url; } catch { return url; } }
function personInitials(person) {
  return person.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
function PersonPhoto({ person, className = '', style }) {
  const photo = person.id === 'mohit-sharma' ? site.photo : person.photo;
  if (photo) return <img className={className} style={style} src={asset(photo)} alt={person.name}/>;
  return <span className={`person-initials ${className}`} style={style} aria-label={person.name}>{personInitials(person)}</span>;
}
function PeopleStrip({ ids = [] }) {
  return <div className="people-strip">{ids.map(id => people[id]).filter(Boolean).map(person => {
    const isMohit = person.id === 'mohit-sharma';
    const href = isMohit ? '#home' : (person.website || '#');
    return <a key={person.id} href={href} {...(!isMohit && person.website ? externalAttrs : {})} className="person-chip"><PersonPhoto person={person}/><span><strong>{person.name}</strong><small>{person.affiliation}</small></span></a>;
  })}</div>;
}
function People() { return <><Section title="Collaborators"><Row className="g-3">{collaborators.filter(c => c.id !== 'mohit-sharma').map(c => <Col sm={6} lg={4} xl={3} xxl={2} key={c.id}><a href={c.website || '#'} {...(c.website ? externalAttrs : {})} className="person-card person-card--collaborator card h-100"><PersonPhoto person={c} className="person-card-photo"/><div className="person-card-body"><h3>{c.name}</h3><p>{c.designation}</p><small>{c.affiliation}</small><em>{c.area}</em></div></a></Col>)}</Row></Section><Students/></>; }
function Students() {
  const liveOrder = ['Masters','Undergrad','Intern','PhD','Postdoc'];
  const alumniOrder = ['Masters','Undergrad','Intern','PhD','Postdoc'];
  const active = students.filter(s => !s.alumni);
  const alumni = students.filter(s => s.alumni);
  const StudentCard = ({ s }) => {
    const href = s.website || '#';
    const linked = Boolean(s.website);
    const card = <BsCard className="student-card h-100"><BsCard.Body><div className="student-head"><PersonPhoto person={s}/><div><h3>{s.name}</h3><p>{s.program} · {s.affiliation}</p></div></div><p>{s.projectUrl ? <a href={s.projectUrl} {...externalAttrs} onClick={(e) => e.stopPropagation()}>{s.project}</a> : s.project}</p><small>{s.duration}{s.currentPosition ? ` · Current: ${s.currentPosition}` : ''}</small>{s.links?.length > 0 && <div className="card-actions mt-3">{s.links.map((l,i)=><LinkButton key={i} href={l.url || l.path}>{l.label || `Work ${i+1}`}</LinkButton>)}</div>}</BsCard.Body></BsCard>;
    return linked ? <a className="student-link" href={href} {...externalAttrs}>{card}</a> : <div className="student-link">{card}</div>;
  };
  const renderGroup = (items, label, order) => <>{order.map(g => {
    const group = items.filter(s => normalizeKeyword(s.category) === normalizeKeyword(g));
    if (!group.length) return null;
    return <div key={`${label}-${g}`} className="mb-4"><h3>{label}: {g}</h3><Row className="g-3">{group.map(s => <Col md={6} xl={4} key={s.id}><StudentCard s={s}/></Col>)}</Row></div>;
  })}</>;
  return <Section title="Students / Mentees and Alumni">{active.length ? renderGroup(active, 'Students', liveOrder) : null}{alumni.length ? renderGroup(alumni, 'Alumni', alumniOrder) : null}</Section>;
}
function Teaching() { return <><Section title="Teaching"><Row className="g-3">{teaching.map(t => <Col md={6} xl={4} key={t.institution + t.course}><BsCard className="h-100"><BsCard.Body><h3>{t.course}</h3><p>{t.role} · {t.institution}</p><small>{t.year}</small><p>{t.description}</p></BsCard.Body></BsCard></Col>)}</Row></Section><Section title="Teaching Interests"><BsCard><BsCard.Body>Data Structures and Algorithms; Computer Graphics and Scientific Visualization; Topological Data Analysis and Computational Topology.</BsCard.Body></BsCard></Section></>; }
function TalkCard({ talk: t, setRoute }) {
  const [open, setOpen] = useState(false);
  const hasVideo = hasValue(t.video);
  const talkPubs = (t.publications || []).map(id => pubMap[id]).filter(Boolean);
  return <BsCard className="h-100 talk-card">
    {hasVideo && <div className="talk-video-wrap"><iframe src={youtubeEmbed(t.video)} title={t.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; compute-pressure" allowFullScreen loading="lazy" /></div>}
    <BsCard.Body><h3>{t.title}</h3>{t.date ? <p>{t.date}</p> : null}<p>{t.description}</p>
      {talkPubs.length > 0 && <>
        <Button variant="link" size="sm" className="p-0 mt-1" onClick={() => setOpen(!open)}>Show related items <ChevronDown size={14}/></Button>
        <Collapse in={open}><div className="compact-related mt-2">{talkPubs.map(p => <button key={p.id} onClick={() => goRoute(`publication:${p.id}`, setRoute)}>{p.title}</button>)}</div></Collapse>
      </>}
      <div className="card-actions talk-actions mt-2"><LinkButton href={t.slides}>Slides</LinkButton><LinkButton href={t.video}>Open Video</LinkButton>{(t.media || []).map((m,i)=><LinkButton key={i} href={m.path || m.url}>{m.label || m.type || `Media ${i+1}`}</LinkButton>)}</div>
    </BsCard.Body>
  </BsCard>;
}
function Talks({ setRoute }) {
  return <Section title="Talks & Presentations"><Row className="g-3">{talks.map(t => <Col md={6} xl={4} key={t.id}><TalkCard talk={t} setRoute={setRoute}/></Col>)}</Row></Section>;
}
function normalizeMediaType(item = {}) {
  const explicit = String(item.type || '').toLowerCase();
  if (explicit) return explicit;
  const src = String(item.src || item.image || item.path || item.url || '').toLowerCase();
  if (!src) return 'image';
  if (src.includes('youtube.com') || src.includes('youtu.be') || src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov')) return 'video';
  if (src.endsWith('.pdf')) return 'pdf';
  if (src.endsWith('.ppt') || src.endsWith('.pptx') || src.endsWith('.key')) return 'slides';
  return 'image';
}
function mediaSource(item = {}) { return item.src || item.image || item.path || item.url || ''; }
function normalizeMediaItem(item = {}, defaults = {}) {
  const type = normalizeMediaType(item);
  const source = mediaSource(item);
  return {
    ...item,
    ...defaults,
    id: item.id || defaults.id || `${defaults.groupId || 'media'}-${Math.random().toString(36).slice(2, 8)}`,
    title: item.title || item.label || defaults.title || 'Media item',
    type,
    src: source,
    category: item.category || defaults.category || 'General',
    tags: unique([...(item.tags || []), ...(defaults.tags || [])]).filter(Boolean),
    groupId: item.groupId || defaults.groupId || '',
    relatedIds: item.relatedIds || defaults.relatedIds || [],
    description: item.description || item.caption || defaults.description || '',
    thumbnail: item.thumbnail || defaults.thumbnail || ''
  };
}
const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};
function inferredMediaTimestamp(item = {}) {
  const explicitDate = String(item.date || item.eventDate || '').trim();
  if (explicitDate) {
    const parsed = Date.parse(explicitDate);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const parts = [
    item.title,
    item.caption,
    item.description,
    item.category,
    ...(item.tags || [])
  ].filter(Boolean).map(x => String(x));
  const text = parts.join(' ');
  const lower = text.toLowerCase();

  const ymd = lower.match(/\b(19|20)\d{2}[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (ymd) {
    const parsed = Date.parse(ymd[0].replace(/\./g, '-').replace(/\//g, '-'));
    if (!Number.isNaN(parsed)) return parsed;
  }

  const monthYear = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,?\s+(19|20)\d{2}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december),?\s+(19|20)\d{2}\b/);
  if (monthYear) {
    const token = monthYear[0];
    const m = token.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/);
    const y = token.match(/\b(19|20)\d{2}\b/);
    if (m && y) return Date.UTC(Number(y[0]), MONTHS[m[1]], 15);
  }

  const years = lower.match(/\b(19|20)\d{2}\b/g);
  if (years && years.length) {
    const latest = Math.max(...years.map(Number));
    return Date.UTC(latest, 6, 1);
  }
  return Number.NEGATIVE_INFINITY;
}
function compareMediaChronology(a, b) {
  const ta = inferredMediaTimestamp(a);
  const tb = inferredMediaTimestamp(b);
  if (ta !== tb) return tb - ta;
  return String(a.title || '').localeCompare(String(b.title || ''));
}
function buildUnifiedMedia() {
  const galleryItems = [...gallery, ...(generatedMedia.gallery || [])].map(item => normalizeMediaItem(item));
  const hobbyItems = hobbies.flatMap(h => (h.media || []).map((m, i) => normalizeMediaItem({ id: m.id || `${h.id}-media-${i + 1}`, ...m }, { category: h.title, groupId: h.id, tags: [h.id] })));
  const mergedRaw = [...galleryItems, ...hobbyItems].filter(item => hasValue(item.src));
  const seen = new Set();
  const merged = mergedRaw.filter(item => {
    const key = `${normalizeMediaType(item)}::${String(item.src).trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort(compareMediaChronology);
  const byId = Object.fromEntries(merged.map(item => [item.id, item]));
  return merged.map(item => {
    const groupMatches = item.groupId ? merged.filter(other => other.groupId && other.groupId === item.groupId && other.id !== item.id).map(other => other.id) : [];
    const explicit = (item.relatedIds || []).filter(Boolean);
    const reverse = merged.filter(other => (other.relatedIds || []).includes(item.id)).map(other => other.id);
    const relatedIds = unique([...explicit, ...groupMatches, ...reverse]).filter(id => byId[id]);
    return { ...item, relatedIds };
  });
}
function lightboxVideoSrc(item) {
  const src = String(item.src || '');
  if (!src) return '';
  if (src.includes('youtube.com') || src.includes('youtu.be')) return youtubeEmbed(src);
  return asset(src);
}
function MediaCard({ item, onOpen }) {
  const type = normalizeMediaType(item);
  const src = mediaSource(item);
  const preview = item.thumbnail || (type === 'image' ? src : '');
  return <button className="media-card" onClick={() => onOpen(item)}>
    <div className="media-thumb">
      {preview ? <img src={asset(preview)} alt={item.title} loading="lazy" /> : type === 'video' ? <video src={asset(src)} muted playsInline preload="metadata" /> : <div className="media-card-empty">{type.toUpperCase()}</div>}
      {type === 'video' && <span className="media-play-badge"><PlayCircle size={32}/></span>}
    </div>
    <div><Badge bg="light" text="dark">{item.category}</Badge><h3>{item.title}</h3><p>{item.description}</p></div>
  </button>;
}
function Gallery({ setRoute, initialMediaId = '' }) {
  const mediaItems = useMemo(() => buildUnifiedMedia(), []);
  const categories = ['All', ...unique(mediaItems.map(g => g.category).filter(Boolean)).sort((a, b) => a.localeCompare(b))];
  const visualTypes = ['image', 'video'];
  const types = ['All', ...visualTypes];
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeType, setActiveType] = useState('All');
  const [light, setLight] = useState(null);
  const byId = useMemo(() => Object.fromEntries(mediaItems.map(item => [item.id, item])), [mediaItems]);
  const items = mediaItems.filter(item => (activeCategory === 'All' || item.category === activeCategory) && (activeType === 'All' || normalizeMediaType(item) === activeType) && visualTypes.includes(normalizeMediaType(item)));
  const isCreativeMedia = (item) => ['poetry', 'theatre', 'theater'].includes(normalizeKeyword(item.category));
  const academicItems = items.filter(item => !isCreativeMedia(item));
  const creativeItems = items.filter(isCreativeMedia);
  const galleryGroups = [
    { key: 'academic', title: 'Research, Conferences, and Academic Life', items: academicItems },
    { key: 'creative', title: 'Poetry and Theatre', items: creativeItems }
  ].filter(group => group.items.length > 0);
  const displayedItems = galleryGroups.flatMap(group => group.items);
  const openMedia = (item) => {
    if (!item) return;
    setLight(item);
    goRoute(`gallery:${item.id}`, setRoute);
  };
  const closeMedia = () => {
    setLight(null);
    goRoute('gallery', setRoute);
  };
  useEffect(() => {
    if (!initialMediaId) {
      setLight(null);
      return;
    }
    const item = byId[initialMediaId];
    setLight(item && visualTypes.includes(normalizeMediaType(item)) ? item : null);
  }, [initialMediaId, byId]);
  const relatedAll = light ? (light.relatedIds || []).map(id => byId[id]).filter(Boolean) : [];
  const relatedVisual = relatedAll.filter(item => visualTypes.includes(normalizeMediaType(item)));
  const relatedPublications = unique(relatedAll.filter(item => ['pdf', 'slides'].includes(normalizeMediaType(item)) && hasValue(item.publicationId)).map(item => item.publicationId));
  const relatedActions = [
    ...relatedVisual.map(item => ({
      key: `media-${item.id}`,
      icon: normalizeMediaType(item) === 'video' ? <Video size={16}/> : <ImageIcon size={16}/>,
      label: item.title,
      onClick: () => openMedia(item)
    })),
    ...relatedPublications.map(pubId => ({
      key: `pub-${pubId}`,
      icon: <FileText size={16}/>,
      label: 'Open Publication',
      onClick: () => { goRoute(`publication:${pubId}`, setRoute); setLight(null); }
    }))
  ];
  const lightType = normalizeMediaType(light || {});
  const lightSrc = light ? lightboxVideoSrc(light) : '';
  const lightIsEmbeddedVideo = lightType === 'video' && (String(lightSrc).includes('youtube.com/embed') || String(lightSrc).includes('vimeo.com'));
  const lightIndex = light ? displayedItems.findIndex(item => item.id === light.id) : -1;
  const hasNav = lightIndex >= 0 && displayedItems.length > 1;
  const openPrev = () => {
    if (!hasNav) return;
    const prevIndex = (lightIndex - 1 + displayedItems.length) % displayedItems.length;
    openMedia(displayedItems[prevIndex]);
  };
  const openNext = () => {
    if (!hasNav) return;
    const nextIndex = (lightIndex + 1) % displayedItems.length;
    openMedia(displayedItems[nextIndex]);
  };
  useEffect(() => {
    if (!light) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeMedia();
      if (e.key === 'ArrowLeft') openPrev();
      if (e.key === 'ArrowRight') openNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [light, hasNav, lightIndex, displayedItems]);
  return <>
    <Section title="Gallery">
      <div className="filters-bar publication-filters">
        <Form.Select value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</Form.Select>
        <Form.Select value={activeType} onChange={e => setActiveType(e.target.value)}>{types.map(t => <option key={t} value={t}>{t === 'All' ? 'All media types' : t.toUpperCase()}</option>)}</Form.Select>
      </div>
      {galleryGroups.map(group => <div className="gallery-group" key={group.key}>
        <div className="gallery-group-title"><h3>{group.title}</h3><span>{group.items.length} item{group.items.length === 1 ? '' : 's'}</span></div>
        <div className="media-grid">{group.items.map(item => <MediaCard key={item.id} item={item} onOpen={openMedia}/>)}</div>
      </div>)}
    </Section>
    {light && <div className="lightbox" onClick={closeMedia}>
      <button className="lightbox-close" aria-label="Close" onClick={(e) => { e.stopPropagation(); closeMedia(); }}><X/></button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {hasNav && <button className="lightbox-nav lightbox-nav-prev" aria-label="Previous media" onClick={openPrev}><ChevronLeft size={24}/></button>}
        {hasNav && <button className="lightbox-nav lightbox-nav-next" aria-label="Next media" onClick={openNext}><ChevronRight size={24}/></button>}
        {lightType === 'video'
          ? (lightIsEmbeddedVideo
              ? <iframe className="lightbox-media lightbox-media-frame" src={lightSrc} title={light.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure" allowFullScreen/>
              : <video className="lightbox-media" src={asset(light.src)} controls autoPlay playsInline/>)
          : <img className="lightbox-media" src={asset(light.src)} alt={light.title}/>}
        <div className="lightbox-overlay">
          <h3>{light.title}</h3>
          <p>{light.description}</p>
          {relatedActions.length > 0 && <div className="lightbox-actions mt-2">{relatedActions.map(action => <button key={action.key} className="lightbox-action-btn" onClick={action.onClick}><span>{action.icon}</span>{action.label}</button>)}</div>}
        </div>
      </div>
    </div>}
  </>;
}
function Contact() { return <Section title="Contact"><Row className="g-3"><Col lg={6}><BsCard className="h-100"><BsCard.Body><h3>Email</h3>{site.emails.map(e => <p key={e}><a href={`mailto:${e}`}>{e}</a></p>)}<h3>Address</h3><p>{site.affiliation}<br/>Linköping University, Sweden</p></BsCard.Body></BsCard></Col><Col lg={6}><BsCard className="h-100"><BsCard.Body><h3>Profiles</h3><div className="vertical-links">{Object.entries(site.links).map(([label, url]) => <LinkButton key={label} href={url}>{label}</LinkButton>)}</div></BsCard.Body></BsCard></Col></Row></Section>; }
function NewsPage({ setRoute }) { const [view, setView] = useState('list'); return <Section title="News / Updates" aside={<ButtonGroup><Button variant={view === 'list' ? 'primary' : 'outline-primary'} onClick={() => setView('list')}><List size={16}/></Button><Button variant={view === 'grid' ? 'primary' : 'outline-primary'} onClick={() => setView('grid')}><LayoutGrid size={16}/></Button></ButtonGroup>}><div className={view === 'grid' ? 'news-grid' : 'news-list'}>{news.map(n => <NewsCard item={n} key={n.date + n.title} setRoute={setRoute}/>)}</div></Section>; }
function NotFound() { return <Section title="Not found"><p>The requested page was not found.</p></Section>; }
function App() {
  const [route, setRoute] = useState(location.hash.replace('#', '') || 'home');
  const previousRoute = useRef(route);
  React.useEffect(() => {
    const fn = () => setRoute(location.hash.replace('#', '') || 'home');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  React.useEffect(() => {
    const fromGalleryPreview = previousRoute.current === 'gallery' || previousRoute.current.startsWith('gallery:');
    const toGalleryPreview = route === 'gallery' || route.startsWith('gallery:');
    previousRoute.current = route;
    if (fromGalleryPreview && toGalleryPreview) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route]);
  const setR = r => goRoute(r, setRoute);
  let page;
  if (route.startsWith('publication:')) page = <PublicationPage id={route.split(':')[1]} setRoute={setR}/>;
  else if (route.startsWith('project:')) page = <ProjectPage id={route.split(':')[1]} setRoute={setR}/>;
  else if (route.startsWith('gallery:')) page = <Gallery setRoute={setR} initialMediaId={route.slice('gallery:'.length)}/>;
  else page = { home: <Home setRoute={setR}/>, about: <About/>, research: <Research setRoute={setR}/>, projects: <Projects setRoute={setR}/>, publications: <Publications setRoute={setR}/>, people: <People/>, teaching: <Teaching/>, talks: <Talks setRoute={setR}/>, gallery: <Gallery setRoute={setR}/>, contact: <Contact/>, news: <NewsPage setRoute={setR}/> }[route] || <Home setRoute={setR}/>;
  return <><Header route={route} setRoute={setR}/><Container fluid="xxl" as="main" className="site-main"><GlobalSearch setRoute={setR}/>{page}</Container><footer className="site-footer"><Container fluid="xxl"><strong>{site.name}</strong><span>{site.affiliation}</span></Container></footer></>;
}

createRoot(document.getElementById('root')).render(<App/>);
