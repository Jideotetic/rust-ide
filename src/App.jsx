import Editor from "@monaco-editor/react";
import { useState } from "react";

function App() {
  const [value, setValue] = useState("");

  const handleEditorChange = (value) => {
    setValue(value);
  };

  return (
    <>
      <Editor
        height="100vh"
        width="100vw"
        theme="vs-dark"
        language="rust"
        value={value}
        onChange={handleEditorChange}
        options={{
          selectOnLineNumbers: true,
          automaticLayout: true,
        }}
      />
    </>
  );
}

export default App;
