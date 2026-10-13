import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import LiveApp from './LiveApp';
import ReplayApp from './ReplayApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/live/:year/:round/:type" element={<LiveApp />} />
        <Route path="/replay/:year/:round/:type" element={<ReplayApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
