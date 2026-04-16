import re
import sys

def update_html():
    try:
        with open('docs/PRD.md', 'r', encoding='utf-8') as f:
            md_content = f.read()
            
        with open('docs/PRD.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        # The pattern to match everything inside <script type="text/markdown" id="prd-markdown">...</script>
        pattern = re.compile(r'(<script type="text/markdown" id="prd-markdown">).*?(</script>)', re.DOTALL)
        
        def repl(m):
            return m.group(1) + '\n' + md_content + '\n    ' + m.group(2)
            
        new_html = pattern.sub(repl, html_content)
        
        with open('docs/PRD.html', 'w', encoding='utf-8') as f:
            f.write(new_html)
            
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_html()
