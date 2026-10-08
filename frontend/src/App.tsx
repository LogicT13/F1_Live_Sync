import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import LiveApp from './LiveApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/live/:year/:round/:type" element={<LiveApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
