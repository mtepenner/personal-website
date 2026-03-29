import requests
from openai import OpenAI
from jinja2 import Template
from datetime import datetime
import xml.etree.ElementTree as ET

# --- KEYLESS AI CONFIGURATION ---
# Pointing to a local inference server like Ollama
client = OpenAI(
    base_url="http://localhost:11434/v1", 
    api_key="keyless-local" 
)

def fetch_keyless_news(category):
    """Fetches the top headline using public RSS feeds instead of an API."""
    # Using Google News RSS search as a reliable, keyless source
    url = f"https://news.google.com/rss/search?q={category}&hl=en-US&gl=US&ceid=US:en"
    
    try:
        response = requests.get(url)
        root = ET.fromstring(response.content)
        
        # Navigate the XML tree to find the first news item
        first_item = root.find('.//item')
        title = first_item.find('title').text
        
        # RSS descriptions can be messy HTML, so we rely on the AI to expand the headline
        return title, f"Recent developments in {category}."
    except Exception as e:
        return "Wires Down", "Communication with the outside world is currently limited."

def get_keyless_image(query):
    """Fetches a keyword-based placeholder image without an API key."""
    # LoremFlickr uses the URL path to return a relevant image
    clean_query = query.replace(" ", ",")
    # Appending a timestamp bypasses browser caching to ensure fresh images
    timestamp = int(datetime.now().timestamp())
    return f"https://loremflickr.com/800/450/{clean_query}?lock={timestamp}"

def viola_davis_rewrite(headline, snippet, section):
    """Uses a local AI to channel Viola Davis and write the story."""
    prompt = f"You are Viola Davis, the world's most authoritative journalist. Write a formal, high-prestige 120-word news story for the {section} section based on this: {headline}. Context: {snippet}."

    try:
        response = client.chat.completions.create(
            model="llama3", # Ensure this matches your downloaded local model
            messages=[{"role": "system", "content": "You are a Pulitzer Prize-winning editor."},
                      {"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Editorial desk unreachable. Please ensure your local AI server is running. Error: {e}"

# --- MAIN PROCESS ---
print("Daily Herald Editorial Team is assembling...")

sections = {
    "politics": "politics",
    "sports": "sports",
    "culture": "entertainment"
}

news_data = {}

for key, cat in sections.items():
    print(f"Viola Davis is reporting on {key}...")
    h, s = fetch_keyless_news(cat)
    
    # Extract the longest word from the headline to use as an image search keyword
    words = [word for word in h.split() if word.isalnum()]
    best_keyword = max(words, key=len) if words else cat
    
    news_data[key] = {
        "headline": h,
        "content": viola_davis_rewrite(h, s, key),
        "image": get_keyless_image(best_keyword) 
    }

# --- LOAD AND RENDER ---
print("Printing today's edition...")
try:
    with open("index.html", "r") as f:
        template_content = f.read()
except FileNotFoundError:
    # A basic fallback template if the HTML file doesn't exist yet
    template_content = """
    <html>
    <head><title>The Daily Herald</title></head>
    <body style="font-family: serif; max-width: 800px; margin: auto;">
        <h1 style="text-align: center; border-bottom: 2px solid black;">The Daily Herald</h1>
        <h3 style="text-align: center;">{{ date }}</h3>
        
        <h2>Politics</h2>
        <img src="{{ politics.image }}" style="width:100%; max-height:400px; object-fit:cover;">
        <h3>{{ politics.headline }}</h3>
        <p>{{ politics.content }}</p>
        <hr>
        
        <h2>Sports</h2>
        <img src="{{ sports.image }}" style="width:100%; max-height:400px; object-fit:cover;">
        <h3>{{ sports.headline }}</h3>
        <p>{{ sports.content }}</p>
        <hr>
        
        <h2>Culture</h2>
        <img src="{{ culture.image }}" style="width:100%; max-height:400px; object-fit:cover;">
        <h3>{{ culture.headline }}</h3>
        <p>{{ culture.content }}</p>
    </body>
    </html>
    """

template = Template(template_content)

final_html = template.render(
    date=datetime.now().strftime("%A, %B %d, %Y"),
    politics=news_data['politics'],
    sports=news_data['sports'],
    culture=news_data['culture']
)

# Output final file
with open("herald_published.html", "w", encoding="utf-8") as f:
    f.write(final_html)

print("Done! Open 'herald_published.html' to see your fully keyless newspaper.")
