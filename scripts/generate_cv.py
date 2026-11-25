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
from reportlab.pdfbase.pdfdoc import PDFString
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
INK = colors.HexColor("#1E2230")
SLATE = colors.HexColor("#343B4D")
MUTED = colors.HexColor("#464E5F")
BRAND = colors.HexColor("#4C2FB5")
LINK_HEX = "#0B4F9C"
LINK = colors.HexColor(LINK_HEX)
RULE = colors.HexColor("#D2D6E2")
ROW_RULE = colors.HexColor("#E4E7F0")
CONTACT_BG = colors.HexColor("#F3F6FB")
CONTACT_BORDER = colors.HexColor("#C5D3E8")
SEPARATOR = " \u00b7 "
BULLET = "\u2022 "


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


def link(label: str, url: str) -> str:
    safe_url = escape(url, quote=True)
    safe_label = escape(label)
    return (
        f'<a href="{safe_url}" color="{LINK_HEX}">'
        f'<u color="{LINK_HEX}" width="0.7" offset="-1.9">{safe_label}</u>'
        f"</a>"
    )


def phone_link(number: str, scheme: str) -> str:
    digits = re.sub(r"\D", "", number)
    if re.fullmatch(r"[1-9]\d{6,14}", digits) is None:
        raise ValueError("Contact numbers must include an international country code")
    return f"https://wa.me/{digits}" if scheme == "whatsapp" else f"tel:+{digits}"


def short_display_url(url: str) -> str:
    return re.sub(r"^https?://", "", url).rstrip("/")


def bookmark_paragraph(
    markup: str,
    style: ParagraphStyle,
    *,
    bookmark_key: str,
    bookmark_title: str,
    bookmark_level: int = 0,
) -> Paragraph:
    flowable = Paragraph(markup, style)
    flowable._bookmark_key = bookmark_key  # type: ignore[attr-defined]
    flowable._bookmark_title = bookmark_title  # type: ignore[attr-defined]
    flowable._bookmark_level = bookmark_level  # type: ignore[attr-defined]
    return flowable


class AccessibleCVTemplate(SimpleDocTemplate):
    """SimpleDocTemplate that emits PDF outline bookmarks for headings."""

    def afterFlowable(self, flowable: Any) -> None:
        key = getattr(flowable, "_bookmark_key", None)
        title = getattr(flowable, "_bookmark_title", None)
        if not key or not title:
            return
        level = getattr(flowable, "_bookmark_level", 0)
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(title, key, level=level, closed=False)


def make_accessible_canvas(link_descriptions: dict[str, str]) -> type[canvas.Canvas]:
    class AccessibleCanvas(canvas.Canvas):
        def linkURL(
            self,
            url: str,
            rect: tuple[float, float, float, float],
            relative: int = 0,
            thickness: float = 0,
            color: Any = None,
            dashArray: Any = None,
            kind: str = "URI",
            **kw: Any,
        ) -> None:
            x0, y0, x1, y1 = rect
            padded_rect = (x0 - 1.0, y0 - 1.5, x1 + 1.0, y1 + 1.5)
            description = link_descriptions.get(url, f"Open link: {url}")
            kw.setdefault("Contents", PDFString(description))
            super().linkURL(
                url,
                padded_rect,
                relative=relative,
                thickness=thickness,
                color=color,
                dashArray=dashArray,
                kind=kind,
                **kw,
            )

    return AccessibleCanvas


def section_heading(title: str, key: str, style: ParagraphStyle) -> list[Any]:
    heading = bookmark_paragraph(
        escape(title),
        style,
        bookmark_key=key,
        bookmark_title=title,
        bookmark_level=0,
    )
    divider = HRFlowable(
        width="100%",
        thickness=0.75,
        color=RULE,
        spaceBefore=0,
        spaceAfter=6,
    )
    divider.keepWithNext = True
    return [heading, divider]


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
            spaceAfter=5,
            alignment=TA_LEFT,
        ),
        "name": ParagraphStyle(
            "name",
            fontName="VeraBold",
            fontSize=24,
            leading=28,
            textColor=INK,
            spaceAfter=4,
        ),
        "headline": ParagraphStyle(
            "headline",
            fontName="VeraBold",
            fontSize=11.5,
            leading=15,
            textColor=BRAND,
            spaceAfter=3,
        ),
        "meta": ParagraphStyle(
            "meta",
            fontName="Vera",
            fontSize=8.5,
            leading=12,
            textColor=MUTED,
            spaceAfter=3,
        ),
        "contact": ParagraphStyle(
            "contact",
            fontName="Vera",
            fontSize=8.5,
            leading=14,
            textColor=INK,
            spaceAfter=0,
        ),
        "section": ParagraphStyle(
            "section",
            fontName="VeraBold",
            fontSize=10,
            leading=13,
            textColor=BRAND,
            spaceBefore=10,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "employer": ParagraphStyle(
            "employer",
            fontName="VeraBold",
            fontSize=10.5,
            leading=14,
            textColor=INK,
            spaceBefore=2,
            spaceAfter=1,
            keepWithNext=True,
        ),
        "role": ParagraphStyle(
            "role",
            fontName="VeraBold",
            fontSize=9.2,
            leading=13,
            textColor=SLATE,
            spaceAfter=2,
            keepWithNext=True,
        ),
        "skill_label": ParagraphStyle(
            "skill_label",
            fontName="VeraBold",
            fontSize=8.8,
            leading=12.5,
            textColor=INK,
            spaceAfter=0,
        ),
        "skill_text": ParagraphStyle(
            "skill_text",
            fontName="Vera",
            fontSize=8.8,
            leading=12.5,
            textColor=INK,
            spaceAfter=0,
        ),
        "date": ParagraphStyle(
            "date",
            fontName="Vera",
            fontSize=8.3,
            leading=11.5,
            textColor=MUTED,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Vera",
            fontSize=9,
            leading=13,
            textColor=INK,
            leftIndent=11,
            firstLineIndent=-11,
            spaceAfter=4.2,
        ),
        "project_title": ParagraphStyle(
            "project_title",
            fontName="VeraBold",
            fontSize=9.5,
            leading=13.5,
            textColor=LINK,
            spaceAfter=2,
            keepWithNext=True,
        ),
        "project_url": ParagraphStyle(
            "project_url",
            fontName="Vera",
            fontSize=8.3,
            leading=12.5,
            textColor=MUTED,
            spaceAfter=8,
        ),
        "page_header": ParagraphStyle(
            "page_header",
            fontName="VeraBold",
            fontSize=11,
            leading=14,
            textColor=INK,
            spaceAfter=2,
        ),
    }

    email_url = f"mailto:{data['email']}"
    whatsapp_url = phone_link(data["whatsapp"], "whatsapp")
    tel_url = phone_link(data["phone"], "phone")
    link_descriptions: dict[str, str] = {
        email_url: f"Send email to {data['email']}",
        whatsapp_url: f"Open WhatsApp chat with {data['whatsapp']}",
        tel_url: f"Call phone number {data['phone']}",
    }
    for label, url in data["links"].items():
        link_descriptions[url] = f"Open {label}: {url}"
    for project in data["projects"]:
        link_descriptions[project["url"]] = (
            f"Open {project['name']} on GitHub: {project['url']}"
        )

    output = ROOT / "public/Victor_Jimenez_CV.pdf"
    doc = AccessibleCVTemplate(
        str(output),
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=32,
        bottomMargin=38,
        title=f"{data['name']} - Curriculum Vitae",
        author=data["name"],
        subject=data["headline"],
        creator="Victor Jimenez Portfolio CV Generator",
        keywords=", ".join(data.get("shared_skills", [])),
        lang="en",
        displayDocTitle=True,
        invariant=1,
    )
    # SimpleDocTemplate's default frame applies 6pt left/right padding.
    content_width = doc.width - 12

    contact_line_1 = (
        f"<b>Email:</b> {link(data['email'], email_url)}"
        f"{SEPARATOR}<b>WhatsApp:</b> {link(data['whatsapp'], whatsapp_url)}"
        f"{SEPARATOR}<b>Phone:</b> {link(data['phone'], tel_url)}"
    )
    profile_links = []
    for label, url in data["links"].items():
        if label == "Portfolio":
            profile_links.append(link(f"{label} ({short_display_url(url)})", url))
        else:
            profile_links.append(link(label, url))
    contact_line_2 = f"<b>Links:</b> {SEPARATOR.join(profile_links)}"

    contact_box = Table(
        [[Paragraph(contact_line_1 + "<br/>" + contact_line_2, styles["contact"])]],
        colWidths=[content_width],
        hAlign="LEFT",
    )
    contact_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CONTACT_BG),
                ("BOX", (0, 0), (-1, -1), 0.6, CONTACT_BORDER),
                ("LINEBEFORE", (0, 0), (0, -1), 2.5, LINK),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5.5),
            ]
        )
    )

    story: list[Any] = [
        bookmark_paragraph(
            escape(data["name"]),
            styles["name"],
            bookmark_key="cv-top",
            bookmark_title=f"{data['name']} - {data['headline']}",
            bookmark_level=0,
        ),
        paragraph(data["headline"], styles["headline"]),
        paragraph(
            f"{data['specialty']}  |  {data['location']}  |  {data['languages']}",
            styles["meta"],
        ),
        Spacer(1, 3),
        contact_box,
        *section_heading("Professional profile", "sec-profile", styles["section"]),
        paragraph(data["profile"], styles["body"]),
        *section_heading("Technical skills", "sec-skills", styles["section"]),
    ]

    skill_rows = [
        [
            paragraph(skill["label"], styles["skill_label"]),
            paragraph(skill["text"], styles["skill_text"]),
        ]
        for skill in data["skills"]
    ]
    skills = Table(skill_rows, colWidths=[134, content_width - 134], hAlign="LEFT")
    skills.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), 10),
                ("RIGHTPADDING", (1, 0), (1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, ROW_RULE),
            ]
        )
    )
    story.extend(
        [
            skills,
            *section_heading(
                "Professional experience", "sec-experience", styles["section"]
            ),
        ]
    )

    current = data["current"]
    story.extend(
        [
            bookmark_paragraph(
                escape(current["employer"]),
                styles["employer"],
                bookmark_key="exp-current",
                bookmark_title=f"{current['employer']} - {current['role']}",
                bookmark_level=1,
            ),
            paragraph(current["role"], styles["role"]),
            paragraph(current["dates"], styles["date"]),
            paragraph(current["summary"], styles["body"]),
        ]
    )
    story.extend(
        paragraph(BULLET + item, styles["bullet"]) for item in current["bullets"]
    )

    story.extend(
        [
            PageBreak(),
            paragraph(
                f"{data['name']}{SEPARATOR}{data['headline']}",
                styles["page_header"],
            ),
            *section_heading("Earlier experience", "sec-earlier", styles["section"]),
        ]
    )
    for index, role in enumerate(data["earlier"]):
        story.append(
            KeepTogether(
                [
                    bookmark_paragraph(
                        escape(role["employer"]),
                        styles["employer"],
                        bookmark_key=f"exp-earlier-{index}",
                        bookmark_title=f"{role['employer']} - {role['role']}",
                        bookmark_level=1,
                    ),
                    paragraph(role["role"], styles["role"]),
                    paragraph(role["dates"], styles["date"]),
                    paragraph(role["summary"], styles["body"]),
                    Spacer(1, 5),
                ]
            )
        )

    story.extend(
        section_heading(
            "Selected personal projects", "sec-projects", styles["section"]
        )
    )
    for index, project in enumerate(data["projects"]):
        story.append(
            KeepTogether(
                [
                    bookmark_paragraph(
                        link(project["name"], project["url"]),
                        styles["project_title"],
                        bookmark_key=f"proj-{index}",
                        bookmark_title=project["name"],
                        bookmark_level=1,
                    ),
                    paragraph(project["summary"], styles["body"]),
                    Paragraph(
                        f"<b>GitHub:</b> {link(short_display_url(project['url']), project['url'])}",
                        styles["project_url"],
                    ),
                ]
            )
        )

    story.extend(
        section_heading("Education & languages", "sec-education", styles["section"])
    )
    story.extend(paragraph(BULLET + item, styles["bullet"]) for item in data["education"])
    story.append(Spacer(1, 2))
    story.append(
        Paragraph(f"<b>Languages:</b> {escape(data['languages'])}", styles["body"])
    )

    def footer(pdf: canvas.Canvas, document: SimpleDocTemplate) -> None:
        pdf.saveState()
        pdf.setStrokeColor(RULE)
        pdf.setLineWidth(0.6)
        pdf.line(42, 30, A4[0] - 42, 30)
        pdf.setFont("Vera", 8)
        pdf.setFillColor(MUTED)
        pdf.drawString(42, 18, f"Updated {data['updated']}")
        pdf.drawRightString(A4[0] - 42, 18, f"Page {document.page} of 2")
        pdf.restoreState()

    doc.build(
        story,
        onFirstPage=footer,
        onLaterPages=footer,
        canvasmaker=make_accessible_canvas(link_descriptions),
    )
    copyfile(output, ROOT / "public/victorjimenezcv.pdf")
    return output


if __name__ == "__main__":
    print(generate())
