import "./RouteHydrateFallback.css";

export const RouteHydrateFallback = () => {
  return (
    <div className="route-skeleton" aria-hidden>
      <aside className="route-skeleton__sidebar">
        <div className="route-skeleton__logo route-skeleton__pulse" />
        <div className="route-skeleton__nav">
          <div className="route-skeleton__nav-item route-skeleton__pulse" />
          <div className="route-skeleton__nav-item route-skeleton__pulse" />
          <div className="route-skeleton__nav-item route-skeleton__pulse" />
          <div className="route-skeleton__nav-item route-skeleton__pulse" />
        </div>
      </aside>

      <div className="route-skeleton__main">
        <header className="route-skeleton__header">
          <div className="route-skeleton__title route-skeleton__pulse" />
          <div className="route-skeleton__subtitle route-skeleton__pulse" />
        </header>

        <main className="route-skeleton__content">
          <div className="route-skeleton__card route-skeleton__pulse" />
          <div className="route-skeleton__card route-skeleton__pulse" />
          <div className="route-skeleton__card route-skeleton__pulse" />
        </main>
      </div>
    </div>
  );
};
