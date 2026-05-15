import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Fuse from 'fuse.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card as BsCard, Badge, Button, ButtonGroup, Form, Navbar, Nav, Offcanvas, Tab, Tabs, Collapse } from 'react-bootstrap';
import { Search, ExternalLink, Mail, FileText, GraduationCap, Award, BookOpen, Users, Images, Briefcase, Home as HomeIcon, Newspaper, X, LayoutGrid, List, Download, PlayCircle, ChevronDown, Eye } from 'lucide-react';
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
function supplementaryItems(pub) {
  const legacy = hasValue(pub.supplement) ? [{ label: 'Supplement', type: 'pdf', url: pub.supplement, preview: false }] : [];
  return [...legacy, ...(pub.supplements || [])];
}
function videoItems(pub) { return pub.videos || (hasValue(pub.video) ? [{ label: 'Video', url: pub.video, embed: true }] : []); }
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
  const NavLinks = <>{navItems.map(([id, label, Icon]) => <Nav.Link key={id} href={`#${id}`} active={route === id} onClick={() => { setRoute(id); setShow(false); }}><Icon size={15}/>{label}</Nav.Link>)}</>;
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
    <Row className="g-4 mt-1 home-lower"><Col xl={8}><Section title="Recent Publications" aside={<Button variant="link" size="sm" onClick={() => goRoute('publications', setRoute)}>View all</Button>}><div className="home-publications">{featured.map(p => <HomePublicationCard key={p.id} pub={p} setRoute={setRoute}/>)}</div></Section></Col><Col xl={4} className="home-side-column"><Section title="News"><ScrollableNews setRoute={setRoute}/></Section><HomeMediaHighlight setRoute={setRoute}/></Col></Row>
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
  const items = Array.isArray(homeMedia.items) ? homeMedia.items.filter(Boolean) : [];
  if (homeMedia.enabled === false || items.length === 0) return null;
  const defaultItem = items.find(item => item.id === homeMedia.defaultItemId) || items[0];
  const [activeId, setActiveId] = useState(defaultItem.id || items[0].id);
  const active = items.find(item => item.id === activeId) || defaultItem;
  const openTarget = () => {
    if (!hasValue(active.link)) return;
    if (String(active.link).startsWith('#')) goRoute(String(active.link).replace('#', ''), setRoute);
    else window.open(active.link, '_blank', 'noopener,noreferrer');
  };
  return <div className="home-media-block" aria-label={homeMedia.title || 'Homepage media highlight'}>
    <div className="home-media-card">
      {items.length > 1 && <Form.Select className="home-media-select" value={activeId} onChange={e => setActiveId(e.target.value)} aria-label="Choose homepage media highlight">
        {items.map(item => <option key={item.id} value={item.id}>{item.title || item.caption || item.id}</option>)}
      </Form.Select>}
      <HomeMediaPreview item={active}/>
      {(active.caption || hasValue(active.link)) && <div className="home-media-body">
        {active.caption && <p>{active.caption}</p>}
        {hasValue(active.link) && <Button size="sm" variant="outline-primary" className="rounded-pill" onClick={openTarget}>{active.linkText || 'Open related item'}</Button>}
      </div>}
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
    return <div className="home-media-preview" ref={ref}><iframe title={item.title || 'YouTube media highlight'} src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" /></div>;
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
  return <Section title="Awards and Recognitions"><Row className="g-3">{merged.map((a, idx) => <Col md={6} xl={4} key={`${a.title}-${idx}`}><button className="award-card card h-100" onClick={() => a.publicationId && (location.hash = `publication:${a.publicationId}`)}><BsCard.Body><Award size={18}/><h3>{a.title}</h3><p>{a.organization} · {a.year}</p><small>{a.description}</small></BsCard.Body></button></Col>)}</Row></Section>;
}
function ViewSwitch({ view, setView }) {
  return <ButtonGroup aria-label="Switch view"><Button variant={view === 'list' ? 'primary' : 'outline-primary'} onClick={() => setView('list')}><List size={16}/></Button><Button variant={view === 'grid' ? 'primary' : 'outline-primary'} onClick={() => setView('grid')}><LayoutGrid size={16}/></Button></ButtonGroup>;
}
function Research({ setRoute }) {
  const themes = deriveThemes();
  const [view, setView] = useState('grid');
  return <><Section title="Research Overview"><Row className="g-4 align-items-stretch"><Col lg={7}><BsCard className="h-100 soft-card"><BsCard.Body><p className="lead">My research develops computational and visual methods for extracting, simplifying, and interpreting structures in complex scientific datasets.</p><p>Rather than repeating the project page, this section groups work into broad research themes. Each theme links to compact publication/project summaries and can scale without large paper cards taking over the page.</p></BsCard.Body></BsCard></Col><Col lg={5}><BsCard className="h-100"><BsCard.Body><h3>Future directions</h3><p>Scalable multivariate topology, interactive visual analytics, topology for time-varying data, and topology-assisted machine learning interpretability.</p></BsCard.Body></BsCard></Col></Row></Section><Section title="Research Themes" eyebrow="Compact, scalable theme cards" aside={<ViewSwitch view={view} setView={setView}/>}>{view === 'grid' ? <Row className="g-3">{themes.map(t => <Col md={6} xl={4} key={t.id}><ThemeCard theme={t} setRoute={setRoute}/></Col>)}</Row> : <div className="theme-list">{themes.map(t => <ThemeCard key={t.id} theme={t} setRoute={setRoute} list />)}</div>}</Section></>;
}
function deriveThemes() {
  const defaultThemes = [
    { id: 'multivariate-topology', title: 'Multivariate Topology', description: 'Reeb spaces, Jacobi sets, fiber surfaces, and scalable representations for bivariate and multifield data.' },
    { id: 'scientific-applications', title: 'Scientific Applications', description: 'Topology-driven analysis of chemistry, medical imaging, climate science, and simulation datasets.' },
    { id: 'time-varying-data', title: 'Time-Varying Data', description: 'Tracking, simplifying, and summarizing evolving features in scalar and multivariate fields.' },
    { id: 'visual-analytics-ai', title: 'Visual Analytics and AI', description: 'Interactive systems and topology-based descriptors for interpretable analysis and machine learning workflows.' }
  ];
  return defaultThemes.map(t => {
    const pubs = publications.filter(p => pubKeywords(p).some(k => normalizeKeyword(k).includes(t.id.split('-')[0])) || (p.themes || []).includes(t.id) || (p.projects || []).some(pid => (projectMap[pid]?.themes || []).includes(t.id)));
    const projs = projects.filter(p => (p.themes || []).includes(t.id) || (p.publications || []).some(pid => pubs.some(x => x.id === pid)));
    return { ...t, publications: pubs, projects: projs };
  });
}
function ThemeCard({ theme, setRoute, list = false }) {
  const [open, setOpen] = useState(false);
  return <BsCard className={`theme-card h-100 ${list ? 'theme-card-list' : ''}`}><BsCard.Body><h3>{theme.title}</h3><p>{theme.description}</p><div className="summary-pills"><button onClick={() => goRoute('publications', setRoute)}>{theme.publications.length} publications</button><button onClick={() => goRoute('projects', setRoute)}>{theme.projects.length} projects</button></div><Button variant="link" size="sm" className="p-0 mt-2" onClick={() => setOpen(!open)}>Show related items <ChevronDown size={14}/></Button><Collapse in={open}><div className="compact-related mt-2">{theme.publications.slice(0, 6).map(p => <button key={p.id} onClick={() => goRoute(`publication:${p.id}`, setRoute)}>{p.title}</button>)}</div></Collapse></BsCard.Body></BsCard>;
}
function Projects({ setRoute }) {
  const [view, setView] = useState('grid');
  return <Section title="Projects" eyebrow="Projects connect publications, collaborators, students, and code/data" aside={<ViewSwitch view={view} setView={setView}/>}>{view === 'grid' ? <Row className="g-3">{projects.map(p => <Col md={6} xl={4} key={p.id}><ProjectCard project={p} setRoute={setRoute}/></Col>)}</Row> : <div className="project-list">{projects.map(p => <ProjectCard key={p.id} project={p} setRoute={setRoute} list />)}</div>}</Section>;
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
  return <Section title="Publications" eyebrow="List view is default; filters are computed from publication data"><div className="filters-bar publication-filters"><Form.Control placeholder="Search title, author, venue, keyword" value={q} onChange={e => setQ(e.target.value)} /><Form.Select value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</Form.Select><Form.Select value={type} onChange={e => setType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</Form.Select><Form.Select value={kw} onChange={e => setKw(e.target.value)}>{keywords.map(k => <option key={k} value={k}>{k === 'All' ? 'All keywords' : `${k} (${keywordCounts[k] || ''})`}</option>)}</Form.Select><ButtonGroup><Button variant={view === 'list' ? 'primary' : 'outline-primary'} onClick={() => setView('list')}><List size={16}/></Button><Button variant={view === 'grid' ? 'primary' : 'outline-primary'} onClick={() => setView('grid')}><LayoutGrid size={16}/></Button></ButtonGroup></div><p className="filter-help">To remove or merge keywords, edit <code>src/data/keyword-config.json</code>. Filter keywords are generated from visible publication tags; auto-PDF keywords are controlled by that config.</p><div className={view === 'grid' ? 'pub-grid' : 'pub-list'}>{filtered.map(p => <PublicationCard key={p.id} pub={p} setRoute={setRoute} list={view === 'list'}/>)}</div></Section>;
}
function PublicationCard({ pub, setRoute, list = false }) {
  const kws = pubKeywords(pub, { forFilter: true });
  return <div role="button" tabIndex={0} className={`pub-card card h-100 ${list ? 'pub-card-list' : ''}`} onClick={() => goRoute(`publication:${pub.id}`, setRoute)} onKeyDown={(e) => { if (e.key === 'Enter') goRoute(`publication:${pub.id}`, setRoute); }}>
    <div className="pub-thumb"><img src={asset(pub.thumbnail)} alt={`${pub.title} thumbnail`} loading="lazy"/></div>
    <BsCard.Body>
      <div className="pub-topline"><span className="pub-meta">{pub.type} · {pub.year}</span><AwardBadges pub={pub}/></div>
      <h3>{pub.title}</h3>
      <p className="authors">{pub.authorText}</p>
      <p><em>{pub.venue}</em></p>
      <Tags tags={kws} limit={list ? 12 : 8}/>
      <div className="card-actions"><Button size="sm" className="rounded-pill" onClick={(e) => { e.stopPropagation(); goRoute(`publication:${pub.id}`, setRoute); }}>Details</Button><LinkButton href={primaryPubLink(pub)} onClick={(e) => e?.stopPropagation?.()}>PDF</LinkButton><LinkButton href={pub.doi} onClick={(e) => e?.stopPropagation?.()}>DOI</LinkButton></div>
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
    <div className="home-pub-thumb"><img src={asset(pub.thumbnail)} alt={`${pub.title} thumbnail`} loading="lazy"/></div>
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
        <div className="publication-teaser-wrap"><img className="publication-teaser" src={asset(p.thumbnail)} alt={`${p.title} teaser`} /></div>
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
          {selectedPreview ? <PreviewItem item={selectedPreview}/> : <p className="muted mt-3">No previewable material available yet. Add <code>pdf</code>, <code>localPdf</code>, <code>supplements</code>, or <code>videos</code> in this publication entry.</p>}
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
  return <div className="preview-frame-wrap">{isVideo ? <iframe className="material-frame" src={src} title={item.label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/> : <iframe className="material-frame" src={src} title={item.label} loading="lazy"/>}</div>;
}
function PreviewMedia({ videos = [], supplements = [] }) {
  const previewVideo = videos.find(v => v.preview);
  const previewSupp = supplements.find(s => s.preview);
  if (!previewVideo && !previewSupp) return null;
  const src = previewVideo?.embedUrl || previewVideo?.url || previewVideo?.path || previewSupp?.path || previewSupp?.url;
  const title = previewVideo?.label || previewSupp?.label || 'Supplementary preview';
  if (!src) return null;
  const isYouTube = String(src).includes('youtube.com') || String(src).includes('youtu.be');
  return <div className="supp-preview"><h3>{title}</h3>{isYouTube ? <iframe src={youtubeEmbed(src)} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/> : <iframe src={src} title={title}/>}</div>;
}
function youtubeEmbed(url) { try { const u = new URL(url); const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v'); return id ? `https://www.youtube.com/embed/${id}` : url; } catch { return url; } }
function PeopleStrip({ ids = [] }) { return <div className="people-strip">{ids.map(id => people[id]).filter(Boolean).map(person => <a key={person.id} href={person.website || '#'} {...(person.website ? externalAttrs : {})} className="person-chip"><img src={asset(person.photo)} alt={person.name}/><span><strong>{person.name}</strong><small>{person.affiliation}</small></span></a>)}</div>; }
function People() { return <><Section title="Collaborators"><Row className="g-3">{collaborators.filter(c => c.id !== 'mohit-sharma').map(c => <Col sm={6} lg={4} xl={3} xxl={2} key={c.id}><a href={c.website || '#'} {...(c.website ? externalAttrs : {})} className="person-card card h-100"><img src={asset(c.photo)} alt={c.name}/><h3>{c.name}</h3><p>{c.designation}</p><small>{c.affiliation}</small><em>{c.area}</em></a></Col>)}</Row></Section><Students/></>; }
function Students() {
  const liveOrder = ['Masters','Undergrad','Intern','PhD','Postdoc'];
  const alumniOrder = ['Masters','Undergrad','Intern','PhD','Postdoc'];
  const active = students.filter(s => !s.alumni);
  const alumni = students.filter(s => s.alumni);
  const StudentCard = ({ s }) => {
    const href = s.website || '#';
    const linked = Boolean(s.website);
    const card = <BsCard className="student-card h-100"><BsCard.Body><div className="student-head"><img src={asset(s.photo)} alt={s.name}/><div><h3>{s.name}</h3><p>{s.program} · {s.affiliation}</p></div></div><p>{s.project}</p><small>{s.duration}{s.currentPosition ? ` · Current: ${s.currentPosition}` : ''}</small>{s.links?.length > 0 && <div className="card-actions mt-3">{s.links.map((l,i)=><LinkButton key={i} href={l.url || l.path}>{l.label || `Work ${i+1}`}</LinkButton>)}</div>}</BsCard.Body></BsCard>;
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
function Talks() { return <Section title="Talks & Presentations"><Row className="g-3">{talks.map(t => <Col md={6} xl={4} key={t.id}><BsCard className="h-100"><BsCard.Body><h3>{t.title}</h3><p>{t.venue} {t.date ? `· ${t.date}` : ''}</p><p>{t.description}</p><div className="card-actions"><LinkButton href={t.slides}>Slides</LinkButton><LinkButton href={t.video}>Video</LinkButton>{(t.media || []).map((m,i)=><LinkButton key={i} href={m.path || m.url}>{m.label || m.type || `Media ${i+1}`}</LinkButton>)}</div></BsCard.Body></BsCard></Col>)}</Row></Section>; }
function MediaCard({ item, onOpen }) { const isVideo = item.type === 'video'; return <button className="media-card" onClick={() => onOpen(item)}>{isVideo ? <video src={asset(item.src)} muted playsInline preload="metadata"/> : <img src={asset(item.src)} alt={item.title} loading="lazy"/>}<div><Badge bg="light" text="dark">{item.category}</Badge><h3>{item.title}</h3><p>{item.caption || item.description}</p></div></button>; }
function Gallery() { const allGallery = [...gallery, ...(generatedMedia.gallery || [])]; const cats = unique(allGallery.map(g => g.category)); const [active, setActive] = useState('All'); const [light, setLight] = useState(null); const items = active === 'All' ? allGallery : allGallery.filter(g => g.category === active); return <><Section title="Gallery" eyebrow="Folder-driven media: add files under public/assets/gallery/<category>"><div className="filters-pills"><Button size="sm" variant={active === 'All' ? 'primary' : 'outline-primary'} onClick={() => setActive('All')}>All</Button>{cats.map(c => <Button size="sm" variant={active === c ? 'primary' : 'outline-primary'} key={c} onClick={() => setActive(c)}>{c}</Button>)}</div><div className="media-grid">{items.map(item => <MediaCard key={item.id} item={item} onOpen={setLight}/>)}</div></Section>{light && <div className="lightbox" onClick={() => setLight(null)}><button aria-label="Close"><X/></button>{light.type === 'video' ? <video src={asset(light.src)} controls autoPlay/> : <img src={asset(light.src)} alt={light.title}/>}<h3>{light.title}</h3><p>{light.caption || light.description}</p></div>}</>; }
function Contact() { return <Section title="Contact"><Row className="g-3"><Col lg={6}><BsCard className="h-100"><BsCard.Body><h3>Email</h3>{site.emails.map(e => <p key={e}><a href={`mailto:${e}`}>{e}</a></p>)}<h3>Address</h3><p>{site.affiliation}<br/>Linköping University, Sweden</p></BsCard.Body></BsCard></Col><Col lg={6}><BsCard className="h-100"><BsCard.Body><h3>Profiles</h3><div className="vertical-links">{Object.entries(site.links).map(([label, url]) => <LinkButton key={label} href={url}>{label}</LinkButton>)}</div></BsCard.Body></BsCard></Col></Row></Section>; }
function NewsPage({ setRoute }) { const [view, setView] = useState('list'); return <Section title="News / Updates" aside={<ButtonGroup><Button variant={view === 'list' ? 'primary' : 'outline-primary'} onClick={() => setView('list')}><List size={16}/></Button><Button variant={view === 'grid' ? 'primary' : 'outline-primary'} onClick={() => setView('grid')}><LayoutGrid size={16}/></Button></ButtonGroup>}><div className={view === 'grid' ? 'news-grid' : 'news-list'}>{news.map(n => <NewsCard item={n} key={n.date + n.title} setRoute={setRoute}/>)}</div></Section>; }
function NotFound() { return <Section title="Not found"><p>The requested page was not found.</p></Section>; }
function App() {
  const [route, setRoute] = useState(location.hash.replace('#', '') || 'home');
  React.useEffect(() => {
    const fn = () => setRoute(location.hash.replace('#', '') || 'home');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route]);
  const setR = r => goRoute(r, setRoute);
  let page;
  if (route.startsWith('publication:')) page = <PublicationPage id={route.split(':')[1]} setRoute={setR}/>;
  else if (route.startsWith('project:')) page = <ProjectPage id={route.split(':')[1]} setRoute={setR}/>;
  else page = { home: <Home setRoute={setR}/>, about: <About/>, research: <Research setRoute={setR}/>, projects: <Projects setRoute={setR}/>, publications: <Publications setRoute={setR}/>, people: <People/>, teaching: <Teaching/>, talks: <Talks/>, gallery: <Gallery/>, contact: <Contact/>, news: <NewsPage setRoute={setR}/> }[route] || <Home setRoute={setR}/>;
  return <><Header route={route} setRoute={setR}/><Container fluid="xxl" as="main" className="site-main"><GlobalSearch setRoute={setR}/>{page}</Container><footer className="site-footer"><Container fluid="xxl"><strong>{site.name}</strong><span>{site.affiliation}</span><small>Update content through JSON files and media folders; run scan scripts when adding files.</small></Container></footer></>;
}

createRoot(document.getElementById('root')).render(<App/>);
