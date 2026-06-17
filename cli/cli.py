#!/usr/bin/env python3
"""
LocalAI CLI
Terminal interface to the LocalAI backend
Usage: localai chat / localai models / localai docs
"""

import json
import httpx
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt
from typing import Optional

app = typer.Typer(
    name="localai",
    help="LocalAI - run LLMs locally, no internet required",
    add_completion=False,
)

console = Console()
API = "http://localhost:8765"


def _api(method: str, path: str, **kwargs) -> dict:
    try:
        r = httpx.request(method, f"{API}{path}", timeout=10, **kwargs)
        return r.json()
    except httpx.ConnectError:
        console.print("[red]✗ LocalAI backend is not running.[/red]")
        console.print("  Start it with: [cyan]localai serve[/cyan]")
        raise typer.Exit(1)


# ── serve ─────────────────────────────────────────────────────────────────────

@app.command()
def serve(
    port: int = typer.Option(8765, help="Port to listen on"),
    host: str = typer.Option("127.0.0.1", help="Host to bind to"),
):
    """Start the LocalAI backend server"""
    import uvicorn
    console.print(Panel(
        f"[bold]LocalAI[/bold] backend starting on [cyan]http://{host}:{port}[/cyan]",
        border_style="bright_black"
    ))
    uvicorn.run("backend.server:app", host=host, port=port, reload=False)


# ── chat ──────────────────────────────────────────────────────────────────────

@app.command()
def chat(
    model: Optional[str] = typer.Option(None, "--model", "-m", help="Model to use"),
    system: Optional[str] = typer.Option(None, "--system", "-s", help="System prompt"),
    rag: bool = typer.Option(True, help="Use RAG context from indexed documents"),
):
    """Start an interactive chat session in the terminal"""

    # Pick model
    if not model:
        data = _api("GET", "/models")
        models = data.get("models", [])
        if not models:
            console.print("[yellow]No models installed.[/yellow] Run: [cyan]localai models pull llama3.1:8b[/cyan]")
            raise typer.Exit(1)
        model = models[0]["name"]
        console.print(f"[dim]Using model:[/dim] [cyan]{model}[/cyan]")

    console.print(Panel(
        f"[bold]Chat[/bold] · model=[cyan]{model}[/cyan] · rag=[cyan]{rag}[/cyan]\n"
        "[dim]Type your message, Ctrl+C or 'exit' to quit[/dim]",
        border_style="bright_black"
    ))

    messages = []
    if system:
        messages.append({"role": "system", "content": system})

    while True:
        try:
            user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]")
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Bye.[/dim]")
            break

        if user_input.strip().lower() in ("exit", "quit", "q"):
            console.print("[dim]Bye.[/dim]")
            break

        if not user_input.strip():
            continue

        messages.append({"role": "user", "content": user_input})

        console.print("\n[bold purple]Assistant[/bold purple]", end=" ")

        full_response = ""
        try:
            with httpx.Client(timeout=None) as client:
                with client.stream("POST", f"{API}/chat", json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "use_rag": rag,
                }) as r:
                    for line in r.iter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            full_response += delta
                            print(delta, end="", flush=True)
                        except Exception:
                            continue
        except KeyboardInterrupt:
            print()

        print()
        messages.append({"role": "assistant", "content": full_response})


# ── models ────────────────────────────────────────────────────────────────────

models_app = typer.Typer(help="Manage local models")
app.add_typer(models_app, name="models")


@models_app.command("list")
def models_list():
    """List installed models"""
    data = _api("GET", "/models")
    models = data.get("models", [])
    if not models:
        console.print("[dim]No models installed.[/dim]")
        return
    table = Table(show_header=True, header_style="bold", border_style="bright_black")
    table.add_column("Name", style="cyan")
    table.add_column("Size", justify="right")
    for m in models:
        size = f"{m['size'] / 1e9:.1f} GB" if m.get("size") else "-"
        table.add_row(m["name"], size)
    console.print(table)


@models_app.command("pull")
def models_pull(name: str = typer.Argument(..., help="Model name e.g. llama3.1:8b")):
    """Download a model from Ollama library"""
    console.print(f"Pulling [cyan]{name}[/cyan]…")
    with httpx.Client(timeout=None) as client:
        with client.stream("POST", f"{API}/models/pull", json={"name": name}) as r:
            for line in r.iter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    status = data.get("status", "")
                    total = data.get("total", 0)
                    completed = data.get("completed", 0)
                    if total:
                        pct = int(completed / total * 100)
                        bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
                        print(f"\r  [{bar}] {pct:3d}%  {status[:30]:<30}", end="", flush=True)
                    else:
                        print(f"\r  {status:<50}", end="", flush=True)
                except Exception:
                    continue
    print()
    console.print(f"[green]✓[/green] {name} ready")


@models_app.command("delete")
def models_delete(name: str = typer.Argument(...)):
    """Remove a model"""
    _api("DELETE", f"/models/{name}")
    console.print(f"[green]✓[/green] Deleted {name}")


# ── docs ──────────────────────────────────────────────────────────────────────

docs_app = typer.Typer(help="Manage indexed documents")
app.add_typer(docs_app, name="docs")


@docs_app.command("list")
def docs_list():
    """List indexed documents"""
    data = _api("GET", "/documents")
    docs = data.get("documents", [])
    if not docs:
        console.print("[dim]No documents indexed.[/dim]")
        return
    table = Table(show_header=True, header_style="bold", border_style="bright_black")
    table.add_column("Name", style="cyan")
    table.add_column("Chunks", justify="right")
    table.add_column("Size", justify="right")
    for d in docs:
        table.add_row(d["name"], str(d["chunks"]), d["size"])
    console.print(table)


@docs_app.command("add")
def docs_add(path: str = typer.Argument(..., help="Path to file to index")):
    """Index a document for RAG"""
    from pathlib import Path as P
    p = P(path)
    if not p.exists():
        console.print(f"[red]File not found: {path}[/red]")
        raise typer.Exit(1)
    console.print(f"Indexing [cyan]{p.name}[/cyan]…")
    with open(p, "rb") as f:
        files = {"file": (p.name, f, "application/octet-stream")}
        r = httpx.post(f"{API}/documents/ingest", files=files, timeout=120)
    data = r.json()
    if "error" in data:
        console.print(f"[red]Error: {data['error']}[/red]")
    else:
        console.print(f"[green]✓[/green] Indexed {data['chunks']} chunks")


@docs_app.command("delete")
def docs_delete(doc_id: str = typer.Argument(...)):
    """Remove a document from the index"""
    _api("DELETE", f"/documents/{doc_id}")
    console.print(f"[green]✓[/green] Removed")


# ── status ────────────────────────────────────────────────────────────────────

@app.command()
def status():
    """Show backend and service status"""
    data = _api("GET", "/health")
    models_data = _api("GET", "/models")
    docs_data = _api("GET", "/documents")

    console.print(Panel(
        f"[green]● Backend[/green]  v{data.get('version', '?')}\n"
        f"[cyan]● Models[/cyan]   {len(models_data.get('models', []))} installed\n"
        f"[cyan]● Docs[/cyan]     {len(docs_data.get('documents', []))} indexed",
        title="LocalAI Status", border_style="bright_black"
    ))


if __name__ == "__main__":
    app()
