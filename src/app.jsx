const { useState } = React;

function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{padding: '20px'}}>
      <h1>Test</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
