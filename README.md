# Inject Terminal Agent

An autonomous PowerShell and terminal-based coding agent with dynamic multi-language code execution and zero API keys.

## Quick Installation

Run this directly in your Windows PowerShell or macOS/Linux terminal:

```bash
npm install -g git+https://github.com/seun22470-ui/inject.git
```

Then start the agent:

```bash
inject-agent
# or
forge
```

## Dynamic Multi-Language Code Execution

The agent dynamically detects, compiles, and executes code snippets across programming languages:

| Language | Shortcut | Example |
| :--- | :--- | :--- |
| **Python** | `/py` | `/py print(sum([x**2 for x in range(10)]))` |
| **JavaScript** | `/js` | `/js console.log(process.versions)` |
| **TypeScript** | `/ts` | `/ts const n: number = 42; console.log(n)` |
| **Go** | `/go` | `/go package main; import "fmt"; func main() { fmt.Println("Go!") }` |
| **Rust** | `/rust` | `/rust fn main() { println!("Rust compiled!"); }` |
| **C** | `/c` | `/c #include <stdio.h>\nint main() { printf("Hello C\n"); }` |
| **C++** | `/cpp` | `/cpp #include <iostream>\nint main() { std::cout << "C++"; }` |
| **PHP** | `/php` | `/php <?php echo phpversion();` |
| **Ruby** | `/ruby` | `/ruby puts (1..5).to_a.shuffle` |
| **PowerShell** | `/ps` | `/ps Get-Process | Select-Object -First 5` |
| **Bash** | `/bash` | `/bash uname -a` |

You can also run `/run <lang> <code>` or simply paste raw markdown code blocks (` ```python ... ``` `), which are automatically identified and run.

## Package Management

- `pip install <package>` (Python)
- `npm install <package>` (Node.js)
- `cargo add <package>` (Rust)
- `go get <package>` (Go)
- `gem install <package>` (Ruby)

## Built-in Skills

- `/search <query>`: DuckDuckGo live web search
- `/inspect <url>`: Website framework & tech stack analyzer
- `/extract <url>`: Clean webpage headings, text, and metadata extractor
- `/exec <command>`: Direct PowerShell / shell command execution
- `/help`: Active list of skills
