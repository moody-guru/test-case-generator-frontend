// src/App.js
import React, { useState } from "react";
import "./App.css"; // Make sure to link the CSS file

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [testCaseSummaries, setTestCaseSummaries] = useState([]);
  const [testCaseCode, setTestCaseCode] = useState("");

  const fetchFiles = async () => {
    try {
      if (!repoUrl) {
        alert("Please enter a GitHub repository URL.");
        return;
      }

      // API call to the backend to get the file list
      const response = await fetch("http://localhost:3001/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch files from the repository.");
      }

      const data = await response.json();
      setFiles(data.files);
      setSelectedFiles([]); // Clear selected files when loading a new repo
      setTestCaseSummaries([]); // Clear summaries as well
      setTestCaseCode(""); // Clear test case code
    } catch (error) {
      console.error("Error fetching files:", error);
      alert(error.message);
    }
  };

  const handleFileSelect = async (fileName) => {
    const newSelectedFiles = selectedFiles.includes(fileName)
      ? selectedFiles.filter((file) => file !== fileName)
      : [...selectedFiles, fileName];

    setSelectedFiles(newSelectedFiles);

    // Fetch content of selected files for summary generation
    const filesContent = await Promise.all(
      newSelectedFiles.map(async (file) => {
        const response = await fetch("http://localhost:3001/api/file-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl, filePath: file }),
        });
        const data = await response.json();
        return { name: file, content: data.content };
      })
    );

    // You would then send this 'filesContent' to the AI
    // For now, we'll log it to confirm we have the content
    console.log("Selected Files Content:", filesContent);
  };

  const generateSummaries = async () => {
    try {
      if (selectedFiles.length === 0) {
        alert("Please select at least one file to generate summaries.");
        return;
      }

      // We need to fetch the content of the selected files first
      const filesContent = await Promise.all(
        selectedFiles.map(async (file) => {
          const response = await fetch(
            "http://localhost:3001/api/file-content",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ repoUrl, filePath: file }),
            }
          );
          const data = await response.json();
          return { name: file, content: data.content };
        })
      );

      // API call to the backend for summaries
      const response = await fetch(
        "http://localhost:3001/api/generate-summaries",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filesContent }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate test case summaries.");
      }

      const data = await response.json();
      setTestCaseSummaries(data.summaries);
      setTestCaseCode("");
    } catch (error) {
      console.error("Error generating summaries:", error);
      alert(error.message);
    }
  };

  const generateCode = async (summaryId) => {
    try {
      const selectedSummary = testCaseSummaries.find((s) => s.id === summaryId);
      if (!selectedSummary) return;

      // You would also send the content of the files to the AI here for context
      const filesContent = await Promise.all(
        selectedFiles.map(async (file) => {
          const response = await fetch(
            "http://localhost:3001/api/file-content",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ repoUrl, filePath: file }),
            }
          );
          const data = await response.json();
          return { name: file, content: data.content };
        })
      );

      // API call to the backend for code generation
      const response = await fetch("http://localhost:3001/api/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: selectedSummary.summary,
          filesContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate test case code.");
      }

      const data = await response.json();
      setTestCaseCode(data.code);
    } catch (error) {
      console.error("Error generating code:", error);
      alert(error.message);
    }
  };

  const createPullRequest = async () => {
    try {
      if (!testCaseCode) {
        alert("Please generate test case code first.");
        return;
      }

      const response = await fetch("http://localhost:3001/api/create-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl,
          testCaseCode,
          fileName: `test-case-${Date.now()}.js`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create pull request.");
      }

      const data = await response.json();
      alert(`Pull Request created successfully! URL: ${data.prUrl}`);
    } catch (error) {
      console.error("Error creating PR:", error);
      alert(error.message);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI Test Case Generator</h1>
        <p className="app-subtitle">Enter a GitHub repo URL to get started.</p>
      </header>

      <main className="app-main">
        <section className="input-section card">
          <div className="input-group">
            <input
              type="text"
              className="repo-input"
              placeholder="Enter GitHub Repo URL (e.g., https://github.com/user/repo)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
            <button className="primary-btn" onClick={fetchFiles}>
              Load Files
            </button>
          </div>
        </section>

        {files.length > 0 && (
          <section className="file-section card">
            <h2 className="section-title">Files</h2>
            <ul className="file-list">
              {files.map((file) => (
                <li key={file} className="file-item">
                  <label className="file-label">
                    <input
                      type="checkbox"
                      className="file-checkbox"
                      checked={selectedFiles.includes(file)}
                      onChange={() => handleFileSelect(file)}
                    />
                    <span className="file-name">{file}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              className="secondary-btn"
              onClick={generateSummaries}
              disabled={selectedFiles.length === 0}
            >
              Generate Test Case Summaries
            </button>
          </section>
        )}

        {testCaseSummaries.length > 0 && (
          <section className="summaries-section card">
            <h2 className="section-title">Test Case Summaries</h2>
            <ul className="summaries-list">
              {testCaseSummaries.map((summary) => (
                <li key={summary.id} className="summary-item">
                  <p>{summary.summary}</p>
                  <button
                    className="generate-code-btn"
                    onClick={() => generateCode(summary.id)}
                  >
                    Generate Code
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {testCaseCode && (
          <section className="code-section card">
            <h2 className="section-title">Generated Test Case Code</h2>
            <pre className="code-block">
              <code>{testCaseCode}</code>
            </pre>
            <button className="create-pr-btn" onClick={createPullRequest}>
              Create Pull Request
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
