"""Generate the public CV and its legacy alias from cv/career.json."""

import json
import re
from html import escape
from pathlib import Path
from shutil import copyfile
from typing import Any

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
INK = colors.HexColor("#202332")
MUTED = colors.HexColor("#50596B")
BRAND = colors.HexColor("#4C2FB5")


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


def link(label: str, url: str) -> str:
    return f'<a href="{escape(url, quote=True)}" color="#4C2FB5">{escape(label)}</a>'


def phone_link(number: str, scheme: str) -> str:
    digits = re.sub(r"\D", "", number)
    if re.fullmatch(r"[1-9]\d{6,14}", digits) is None:
        raise ValueError("Contact numbers must include an international country code")
    return f"https://wa.me/{digits}" if scheme == "whatsapp" else f"tel:+{digits}"


def generate() -> Path:
    data: dict[str, Any] = json.loads((ROOT / "cv/career.json").read_text())
    fonts = Path(reportlab.__file__).parent / "fonts"
    pdfmetrics.registerFont(TTFont("Vera", str(fonts / "Vera.ttf")))
    pdfmetrics.registerFont(TTFont("VeraBold", str(fonts / "VeraBd.ttf")))
    pdfmetrics.registerFontFamily("Vera", normal="Vera", bold="VeraBold")

    styles = {
        "body": ParagraphStyle(
            "body",
            fontName="Vera",
            fontSize=9,
            leading=13,
            textColor=INK,
            spaceAfter=6,
            alignment=TA_LEFT,
        ),
        "name": ParagraphStyle(
            "name",
            fontName="VeraBold",
            fontSize=26,
            leading=31,
            textColor=INK,
            spaceAfter=7,
        ),
        "headline": ParagraphStyle(
            "headline",
            fontName="VeraBold",
            fontSize=12,
            leading=17,
            textColor=BRAND,
            spaceAfter=5,
        ),
        "contact": ParagraphStyle(
            "contact",
            fontName="Vera",
            fontSize=8.1,
            leading=12,
            textColor=MUTED,
            spaceAfter=4,
        ),
        "section": ParagraphStyle(
            "section",
            fontName="VeraBold",
            fontSize=10,
            leading=14,
            textColor=BRAND,
            spaceBefore=12,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "role": ParagraphStyle(
            "role",
            fontName="VeraBold",
            fontSize=9.5,
            leading=14,
            textColor=INK,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "date": ParagraphStyle(
            "date",
            fontName="Vera",
            fontSize=8,
            leading=11,
            textColor=MUTED,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Vera",
            fontSize=9,
            leading=13,
            textColor=INK,
            leftIndent=10,
            firstLineIndent=-10,
            spaceAfter=5,
        ),
    }
    output = ROOT / "public/Victor_Jimenez_CV.pdf"
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=36,
        bottomMargin=40,
        title=f"{data['name']} - Curriculum Vitae",
        author=data["name"],
        subject=data["headline"],
        invariant=1,
    )
    story: list[Any] = [
        paragraph(data["name"], styles["name"]),
        paragraph(data["headline"], styles["headline"]),
        paragraph(data["specialty"], styles["contact"]),
        paragraph(f"{data['location']} | {data['languages']}", styles["contact"]),
        Paragraph(
            link(data["email"], f"mailto:{data['email']}")
            + " | "
            + link(
                f"WhatsApp: {data['whatsapp']}",
                phone_link(data["whatsapp"], "whatsapp"),
            )
            + "<br/>"
            + link(f"Phone: {data['phone']}", phone_link(data["phone"], "phone"))
            + " | "
            + " | ".join(link(label, url) for label, url in data["links"].items()),
            styles["contact"],
        ),
        paragraph("Professional profile", styles["section"]),
        paragraph(data["profile"], styles["body"]),
        paragraph("Technical skills", styles["section"]),
    ]
    skill_rows = [
        [
            paragraph(skill["label"], styles["role"]),
            paragraph(skill["text"], styles["body"]),
        ]
        for skill in data["skills"]
    ]
    skills = Table(skill_rows, colWidths=[108, A4[0] - 192])
    skills.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.extend([skills, paragraph("Professional experience", styles["section"])])
    current = data["current"]
    story.extend(
        [
            paragraph(current["employer"], styles["headline"]),
            paragraph(current["role"], styles["role"]),
            paragraph(current["dates"], styles["date"]),
            paragraph(current["summary"], styles["body"]),
        ]
    )
    story.extend(
        paragraph("- " + item, styles["bullet"]) for item in current["bullets"]
    )
    story.extend(
        [
            PageBreak(),
            paragraph(data["name"], styles["headline"]),
            paragraph("Earlier experience", styles["section"]),
        ]
    )
    for role in data["earlier"]:
        story.append(
            KeepTogether(
                [
                    paragraph(role["employer"], styles["headline"]),
                    paragraph(role["role"], styles["role"]),
                    paragraph(role["dates"], styles["date"]),
                    paragraph(role["summary"], styles["body"]),
                    Spacer(1, 5),
                ]
            )
        )
    story.append(paragraph("Selected personal projects", styles["section"]))
    for project in data["projects"]:
        story.append(
            KeepTogether(
                [
                    Paragraph(link(project["name"], project["url"]), styles["role"]),
                    paragraph(project["summary"], styles["body"]),
                    Spacer(1, 3),
                ]
            )
        )
    story.append(paragraph("Education & languages", styles["section"]))
    story.extend(paragraph(item, styles["body"]) for item in data["education"])
    story.append(paragraph(data["languages"], styles["body"]))

    def footer(pdf: canvas.Canvas, document: SimpleDocTemplate) -> None:
        pdf.saveState()
        pdf.setStrokeColor(colors.HexColor("#DCDDE5"))
        pdf.line(42, 31, A4[0] - 42, 31)
        pdf.setFont("Vera", 7)
        pdf.setFillColor(MUTED)
        pdf.drawString(42, 20, f"Updated {data['updated']}")
        pdf.drawRightString(A4[0] - 42, 20, f"{document.page} / 2")
        pdf.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    copyfile(output, ROOT / "public/victorjimenezcv.pdf")
    return output


if __name__ == "__main__":
    print(generate())
