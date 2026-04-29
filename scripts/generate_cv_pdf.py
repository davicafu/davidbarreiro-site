import json
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
RESUME_PATH = ROOT / "resume.json"
OUTPUT_PATH = ROOT / "cv-one-page.pdf"
SITE_URL = "https://davidbarreiro.vercel.app"


def clean_text(value):
    if value is None:
        return ""
    text = str(value)
    fixes = {
        "ñ": "n", "·": "-", "–": "-", "—": "-",
        "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
    }
    for src, target in fixes.items():
        text = text.replace(src, target)
    return " ".join(text.strip().split())


def as_name_list(values, limit=None):
    out = []
    for item in values[:limit] if limit else values:
        if isinstance(item, dict):
            name = clean_text(item.get("name", ""))
            if name:
                out.append(name)
        else:
            txt = clean_text(item)
            if txt:
                out.append(txt)
    return out


def p(text, style):
    return Paragraph(clean_text(text).replace("\n", "<br/>"), style)


def bullet_lines(items, style, max_items, bullet_color):
    out = []
    for item in items[:max_items]:
        txt = clean_text(item)
        if txt:
            out.append(Paragraph(f"<font color='{bullet_color}'>-</font> {txt}", style))
    return out


def build_one_page(data):
    s = getSampleStyleSheet()
    palette = {"ink": "#0f172a", "muted": "#475569", "accent": "#0f766e", "panel": "#f8fafc", "line": "#cbd5e1"}

    style_name = ParagraphStyle("name", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=23, leading=25, textColor=colors.HexColor(palette["ink"]), spaceAfter=2)
    style_role = ParagraphStyle("role", parent=s["Normal"], fontName="Helvetica", fontSize=10.5, leading=13, textColor=colors.HexColor(palette["accent"]), spaceAfter=4)
    style_section = ParagraphStyle("section", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=9.6, leading=12, textColor=colors.HexColor(palette["ink"]), spaceBefore=7, spaceAfter=3)
    style_title = ParagraphStyle("title", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=9.4, leading=11.4, textColor=colors.HexColor(palette["ink"]), spaceAfter=0)
    style_meta = ParagraphStyle("meta", parent=s["Normal"], fontName="Helvetica", fontSize=8.2, leading=10.4, textColor=colors.HexColor(palette["muted"]), spaceAfter=1)
    style_body = ParagraphStyle("body", parent=s["Normal"], fontName="Helvetica", fontSize=8.7, leading=11.5, textColor=colors.HexColor(palette["ink"]), spaceAfter=1.4)
    style_bullet = ParagraphStyle("bullet", parent=s["Normal"], fontName="Helvetica", fontSize=8.5, leading=11.2, textColor=colors.HexColor(palette["ink"]), spaceAfter=1)

    basics = data.get("basics", {})
    loc = basics.get("location", {})
    work = data.get("work", [])
    education = data.get("education", [])
    skills = data.get("skills", [])
    languages = data.get("languages", [])
    certs = data.get("certificates", [])

    left, right = [], []

    left.extend([
        p(basics.get("name", ""), style_name),
        p(basics.get("label", ""), style_role),
        p(f"{clean_text(basics.get('email',''))} | {clean_text(basics.get('phone',''))}", style_meta),
        p(SITE_URL, style_meta),
        p(f"{clean_text(loc.get('city',''))}, {clean_text(loc.get('countryCode',''))}".strip(", "), style_meta),
    ])

    left.append(p("<b>SUMMARY</b>", style_section))
    left.append(p(basics.get("summary", ""), style_body))

    left.append(p("<b>SKILLS</b>", style_section))
    for sk in skills:
        names = as_name_list(sk.get("keywords", []), limit=8)
        if names:
            left.append(p(f"<b>{clean_text(sk.get('name',''))}</b>: {', '.join(names)}", style_body))

    left.append(p("<b>LANGUAGES</b>", style_section))
    for lg in languages:
        left.append(p(f"{clean_text(lg.get('language',''))}: {clean_text(lg.get('fluency',''))}", style_body))

    right.append(p("<b>EXPERIENCE</b>", style_section))
    for w in work:
        right.append(p(f"{clean_text(w.get('name',''))} - {clean_text(w.get('position',''))}", style_title))
        right.append(p(f"{clean_text(w.get('startDate',''))} - {clean_text(w.get('endDate','Present') or 'Present')}", style_meta))
        if w.get("summary"):
            right.append(p(w.get("summary", ""), style_body))
        right.extend(bullet_lines(w.get("highlights", []), style_bullet, max_items=4, bullet_color="#0f766e"))
        right.append(Spacer(1, 4))

    right.append(p("<b>EDUCATION</b>", style_section))
    for ed in education:
        right.append(p(f"{clean_text(ed.get('institution',''))} - {clean_text(ed.get('studyType',''))}", style_title))
        right.append(p(f"{clean_text(ed.get('startDate',''))} - {clean_text(ed.get('endDate',''))}", style_meta))
        right.append(p(clean_text(ed.get("area", "")), style_body))
        tech = as_name_list(ed.get("tech", []), limit=6)
        if tech:
            right.append(p(f"Tech: {', '.join(tech)}", style_meta))
        right.append(Spacer(1, 2))

    right.append(p("<b>CERTIFICATIONS</b>", style_section))
    for cert in certs[:5]:
        right.append(p(f"{clean_text(cert.get('name',''))} ({clean_text(cert.get('date',''))})", style_body))

    doc = SimpleDocTemplate(str(OUTPUT_PATH), pagesize=A4, leftMargin=12 * mm, rightMargin=12 * mm, topMargin=11 * mm, bottomMargin=11 * mm)

    left_box = Table([[left]], colWidths=[86 * mm])
    left_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(palette["panel"])),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor(palette["line"])),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))

    right_box = Table([[right]], colWidths=[98 * mm])
    right_box.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))

    layout = Table([[left_box, right_box]], colWidths=[90 * mm, 100 * mm])
    layout.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    doc.build([layout])


def main():
    data = json.loads(RESUME_PATH.read_text(encoding="utf-8"))
    build_one_page(data)
    print("Generated cv-one-page.pdf")


if __name__ == "__main__":
    main()