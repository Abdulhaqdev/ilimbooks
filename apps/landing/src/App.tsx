import { lazy, Suspense, useEffect, useRef, type ComponentType } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import LandingCompact from './pages/LandingCompact';
import LandingProduct from './pages/LandingProduct';
import { trackMetaPageView } from './pixel';
import { IS_PREVIEW, useLanding, type TemplateProps } from './shared';

const TEMPLATES: Record<string, ComponentType<TemplateProps>> = {
  full: LandingProduct,
  compact: LandingCompact,
  story: lazy(() => import('./templates/TStory')),
  flash: lazy(() => import('./templates/TFlash')),
  problem: lazy(() => import('./templates/TProblem')),
  reviews: lazy(() => import('./templates/TReviews')),
  premium: lazy(() => import('./templates/TPremium')),
  kids: lazy(() => import('./templates/TKids')),
  bundle: lazy(() => import('./templates/TBundle')),
  minimal: lazy(() => import('./templates/TMinimal')),
};

function RoutePixel() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!IS_PREVIEW) trackMetaPageView();
  }, [pathname]);
  return null;
}

function LandingRoute() {
  const { pathname } = useLocation();
  const state = useLanding(pathname);

  if (state.status === 'loading') return <div className="lp-loading" aria-busy="true" />;
  if (state.status === 'missing') {
    return (
      <div className="lp-missing">
        <h1>Sahifa topilmadi</h1>
        <p>Bu manzilda sahifa yo‘q yoki vaqtincha o‘chirilgan.</p>
        <a href="/">Bosh sahifaga o‘tish →</a>
      </div>
    );
  }

  const { template, content } = state.landing;
  const View = TEMPLATES[template] || LandingProduct;
  return (
    <Suspense fallback={<div className="lp-loading" aria-busy="true" />}>
      <View content={content} preview={IS_PREVIEW} />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutePixel />
      <Routes>
        <Route path="*" element={<LandingRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
