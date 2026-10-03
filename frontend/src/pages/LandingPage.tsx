import { useEffect, useState } from "react";
import { Activity, ArrowDown, ArrowRight, Cpu, Menu, Shield, X } from "lucide-react";
import "./LandingPage.css";

const valueCards = [
  { title: "CONTINUOUS", description: "Real-time surface monitoring" },
  { title: "DISTRIBUTED", description: "Dense multi-node sensing" },
  { title: "INTELLIGENT", description: "AI-assisted anomaly detection" },
  { title: "LOW-COST", description: "Accessible prototype architecture" },
];

const stages = [
  {
    number: "01",
    title: "SENSE",
    description: "Distributed surface sensor nodes continuously capture tilt, displacement, vibration and crack activity.",
  },
  {
    number: "02",
    title: "ANALYZE",
    description: "AI/ML processes incoming signals to detect abnormal behaviour, trends and spatial correlations.",
  },
  {
    number: "03",
    title: "ALERT",
    description: "Persistent deformation patterns are converted into risk indicators and early-warning alerts.",
  },
];

const techPills = [
  "ESP32",
  "NRF24L01",
  "Wireless Mesh",
  "IoT Sensors",
  "Isolation Forest",
  "XGBoost",
  "Time-Series Analysis",
  "GIS Visualization",
  "Real-Time Dashboard",
];

const featureCards = [
  {
    title: "Real-Time Monitoring",
    description: "Continuous sensor observations from distributed surface nodes.",
  },
  {
    title: "AI-Based Anomaly Detection",
    description: "Identify abnormal sensor behaviour using machine-learning techniques.",
  },
  {
    title: "Multi-Sensor Correlation",
    description: "Combine tilt, displacement, vibration and crack information.",
  },
  {
    title: "Spatial Correlation",
    description: "Compare neighbouring sensor nodes to distinguish localized disturbances from broader deformation patterns.",
  },
  {
    title: "False-Alarm Reduction",
    description: "Temporary vibration or isolated sensor abnormalities should not automatically be treated as subsidence.",
  },
  {
    title: "Wireless Monitoring",
    description: "Low-cost NRF24L01-based multi-node communication for the prototype.",
  },
  {
    title: "Risk Visualization",
    description: "Display sensor conditions and risk indicators through an interactive dashboard.",
  },
];

function Brand() {
  return (
    <span className="landing-brand">
      <span className="landing-brand__icon"><Activity size={18} /></span>
      <span className="landing-brand__text">MINE<span>SENTINEL</span></span>
    </span>
  );
}

export default function LandingPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openDashboard = () => {
    setMenuOpen(false);
    onNavigate("/dashboard");
  };

  const navItems = [
    { label: "Home", href: "#home" },
    { label: "Overview", href: "#how-it-works" },
    { label: "Live Monitoring", href: "#technology" },
    { label: "AI Risk", href: "#features" },
    { label: "Mine Map", href: "#about" },
    { label: "Network", href: "#about" },
    { label: "Alerts", href: "#about" },
  ];

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    if (href === "#home") {
      onNavigate("/");
      return;
    }

    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="landing-page">
      <header className={`landing-header${scrolled ? " landing-header--scrolled" : ""}`}>
        <a
          className="landing-home"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/");
          }}
          aria-label="MineSentinel home"
        >
          <Brand />
        </a>

        <button
          className="landing-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`landing-nav${menuOpen ? " landing-nav--open" : ""}`} aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = item.label === "Home";
            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`landing-nav__link${isActive ? " landing-nav__link--active" : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  handleNavClick(item.href);
                }}
              >
                {item.label}
              </a>
            );
          })}

          <div className="landing-status-pill"><span className="landing-status-dot" /> System Online</div>
          <button className="landing-button landing-button--small" type="button" onClick={openDashboard}>
            Open Live Dashboard <ArrowRight size={15} />
          </button>
        </nav>
      </header>

      <main>
        <section className="landing-hero" id="home" aria-labelledby="landing-title">
          <div className="landing-hero__content">
            <p className="landing-kicker"><span className="landing-kicker__dot" /> AI-POWERED MINE SAFETY</p>

            <div className="landing-brand-block">
              <span className="landing-brand-block__label">MINE SENTINEL</span>
              <span className="landing-brand-block__pipe" />
              <span className="landing-brand-block__sub">SMART MINE SAFETY SYSTEM</span>
            </div>

            <h1 id="landing-title">
              <span className="landing-title-brand">MineSentinel</span>
              <span className="landing-title-line">Real-Time Mine</span>
              <span className="landing-title-line landing-title-line--accent">Subsidence Monitoring</span>
            </h1>
            <p className="landing-lead">
              Sense ground movement. Detect abnormal behaviour. Predict subsidence risk. Act before it becomes critical.
            </p>

            <div className="landing-actions">
              <button className="landing-button" type="button" onClick={() => handleNavClick("#how-it-works")}>
                Explore MineSentinel <ArrowDown size={15} />
              </button>
              <button className="landing-button landing-button--secondary" type="button" onClick={openDashboard}>
                Open Live Dashboard <ArrowRight size={16} />
              </button>
            </div>

            <div className="landing-system-meta" aria-label="System status summary">
              <span className="landing-system-meta__status"><i /> SYSTEM ONLINE</span>
              <span className="landing-system-meta__status"><i /> 100 SENSOR NODES</span>
              <span className="landing-system-meta__status"><i /> REAL-TIME MONITORING</span>
            </div>
          </div>

        </section>

        <section className="landing-section" id="how-it-works">
          <div className="landing-section__heading">
            <div>
              <small>FROM GROUND SIGNALS TO EARLY WARNING</small>
              <h2>From Ground Signals to Early Warning</h2>
            </div>
          </div>

          <div className="landing-stages">
            {stages.map((stage) => (
              <article className="landing-stage" key={stage.number}>
                <div className="landing-stage__number">{stage.number}</div>
                <div className="landing-stage__icon"><Cpu size={18} /></div>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-technology" id="technology">
          <div className="landing-section__heading">
            <div>
              <small>TECHNOLOGY</small>
              <h2>Built as a Distributed Mine Monitoring Network</h2>
            </div>
          </div>

          <div className="landing-tech-grid" aria-label="Monitoring architecture technologies">
            {techPills.map((item) => (
              <span key={item} className="landing-tech-pill">{item}</span>
            ))}
          </div>
        </section>

        <section className="landing-section landing-product-values" id="features">
          <div className="landing-section__heading">
            <div>
              <small>KEY FEATURES</small>
              <h2>Prototype monitoring designed for field validation and early signal detection.</h2>
            </div>
          </div>

          <div className="landing-value-grid">
            {featureCards.map((card) => (
              <article className="landing-value-card" key={card.title}>
                <span className="landing-value-card__tag">{card.title}</span>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-safety" id="about">
          <div className="landing-safety__icon"><Shield size={23} /></div>
          <div>
            <small>SAFETY &amp; MONITORING</small>
            <h2>Prototype early-warning architecture for continuous surface monitoring.</h2>
            <p>
              MineSentinel is designed to detect abnormal deformation patterns and support AI-assisted risk identification using distributed sensor data. It is a prototype system intended for operational awareness, engineering review, and field validation rather than a certified safety guarantee.
            </p>
            <p className="landing-safety__notice">
              Risk indicators are meant to support investigation and intervention planning, not to replace professional engineering judgement, inspection, or approved mine safety procedures.
            </p>
          </div>
          <span className="landing-safety__status"><i /> HUMAN REVIEW REQUIRED</span>
        </section>

        <section className="landing-closing">
          <div>
            <small>MINESENTINEL / MONITORING WORKSPACE</small>
            <h2>Monitor the ground.<br /><span>Understand the signals.</span></h2>
            <p>Explore the monitoring network, live risk indicators, and AI-assisted insights through the interactive dashboard.</p>
          </div>
          <button className="landing-button" type="button" onClick={openDashboard}>Open MineSentinel Dashboard <ArrowRight size={17} /></button>
        </section>
      </main>

      <footer className="landing-footer">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/");
          }}
        >
          <Brand />
        </a>
        <p>AI-assisted surface monitoring for mine subsidence risk awareness.</p>
        <nav aria-label="Footer navigation">
          <a href="#technology">Technology</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
          <button type="button" onClick={openDashboard}>Dashboard <ArrowRight size={13} /></button>
        </nav>
      </footer>
    </div>
  );
}