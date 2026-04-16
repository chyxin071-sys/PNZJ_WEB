import xml.etree.ElementTree as ET
import sys
import re

def check_xml(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace {{...}} with 'X' to avoid parsing errors with & and <
        content = re.sub(r'\{\{.*?\}\}', 'X', content, flags=re.DOTALL)
        # Also replace standalone & with &amp; if not already
        content = re.sub(r'&(?!(?:[a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);)', '&amp;', content)
        # Remove namespace prefixes like wx: and bind:
        content = re.sub(r'\b(wx|bind|catch|mut-bind|capture-bind|capture-catch):', r'\1_', content)
        content = content.replace("wx_for-item", "wx_for_item")
        # Fix valueless attributes like wx_else -> wx_else="true"
        content = re.sub(r'\b(wx_[a-zA-Z0-9_-]+)\b(?!\s*=)', r'\1="true"', content)
        # Some standard valueless attributes
        content = re.sub(r'\b(enhanced)(?!\s*=)', r'\1="true"', content)
        content = re.sub(r'\b(scroll-x)(?!\s*=)', r'\1="true"', content)
        content = re.sub(r'\b(scroll-y)(?!\s*=)', r'\1="true"', content)
        
        # fix missing root tags or other html elements that are not self-closing
        content = content.replace("<image", "<image_tag")
        content = content.replace("</image>", "</image_tag>")
        content = content.replace("<input", "<input_tag")
        content = content.replace("</input>", "</input_tag>")
        
        content = content.replace("/>", ">")
        # simple self-closing fix
        content = re.sub(r'<(image_tag|input_tag|switch|customer-info)([^>]*)>(?!</\1>)', r'<\1\2/>', content)
        content = re.sub(r'<(image|input|switch)([^>]*)>(?!</\1>)', r'<\1\2/>', content)
        content = content.replace("//>", "/>")
        
        wrapped_content = f"<root>{content}</root>"
        with open('debug.xml', 'w', encoding='utf-8') as f:
            f.write(wrapped_content)
        ET.fromstring(wrapped_content)
        print("XML is valid.")
    except ET.ParseError as e:
        print(f"XML parsing error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_xml(sys.argv[1])
