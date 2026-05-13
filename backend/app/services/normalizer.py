import re


def normalize_title(title: str) -> str:
    text = title.strip().lower()
    text = re.sub(r"[\s#【】\[\]（）()《》,，。.!！?？:：-]+", "", text)
    return text
