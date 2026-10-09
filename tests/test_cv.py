"""Regression checks for the downloadable CV and portfolio career details."""

import hashlib
import importlib.util
import json
import re
import unittest
from html import unescape
from pathlib import Path
from tempfile import TemporaryDirectory

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
EMPLOYER_HASHES = {
    "b34387ed67fa6f422ac319e0520780f109c779378bbb1733a0efc84073567aca",
    "19be59ac14e2c9a24ddf4176a44e52dd11850df776c8655a875c498599505ac9",
    "1eb1c704ba28e8967caf71fdca542d6b01a05385f55dfefbe0bd456bff9de66e",
    "7dd31eb15b39b3d45d04b34a28ced40548e0c63114b059d01c2ee0dd690e21f8",
    "34386854a85704874ae8b98c713aa8083710ff39b6b400d6256faca094404e28",
}


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text)


class CVTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.career = json.loads((ROOT / "cv/career.json").read_text())
        cls.pdf = PdfReader(ROOT / "public/Victor_Jimenez_CV.pdf")
        cls.text = normalized(" ".join(page.extract_text() for page in cls.pdf.pages))
        cls.html = unescape((ROOT / "dist/index.html").read_text())
        cls.site_text = normalized(re.sub(r"<[^>]+>", " ", cls.html))

    def test_two_pages_with_searchable_accented_text(self) -> None:
        self.assertEqual(len(self.pdf.pages), 2)
        for text in (
            "Bogotá",
            "Rootstack",
            "13+ years",
            "UNAD",
            "Universidad del Valle",
        ):
            self.assertIn(text, self.text)
        self.assertEqual(self.text.count("Rootstack"), 1)
        self.assertIn("Earlier experience", self.pdf.pages[1].extract_text())

    def test_site_and_cv_share_identity_dates_and_skills(self) -> None:
        for text in (
            self.career["name"],
            self.career["headline"],
            self.career["location"],
            self.career["languages"],
            self.career["experience"],
            self.career["email"],
            self.career["current"]["dates"],
            *self.career["shared_skills"],
        ):
            with self.subTest(text=text):
                self.assertIn(text, self.text)
                self.assertIn(text, self.site_text)
        for url in self.career["links"].values():
            self.assertIn(url, self.html)
        for role in self.career["earlier"]:
            self.assertIn(role["dates"], self.text)

    def test_product_positioning_and_career_level_scale(self) -> None:
        self.assertEqual(self.career["headline"], "Senior Product Engineer")
        self.assertEqual(self.pdf.metadata.subject, self.career["headline"])
        self.assertIn(self.career["current"]["role"], self.text)
        self.assertIn("60 professional projects across 11 sectors", self.text)
        self.assertIn("as part of project teams", self.text)
        self.assertIn("13+ years", self.text)
        for capability in ("CI/CD", "technical SEO", "performance", "security", "accessibility", "integrations", "automation", "leadership"):
            self.assertIn(capability.lower(), self.text.lower())
            self.assertIn(capability.lower(), self.site_text.lower())
        self.assertNotIn("60", self.career["current"]["summary"])
        self.assertEqual(self.text.count(self.career["current"]["employer"]), 1)
        self.assertEqual(len(self.career["projects"]), 2)
        for project in self.career["projects"]:
            self.assertIn(project["url"], self.html)

    def test_clickable_document_links(self) -> None:
        urls = {
            str(annotation.get_object()["/A"]["/URI"])
            for page in self.pdf.pages
            for annotation in page.get("/Annots", [])
            if "/A" in annotation.get_object()
        }
        required = {
            *self.career["links"].values(),
            *(project["url"] for project in self.career["projects"]),
            f"mailto:{self.career['email']}",
            "https://wa.me/16463913900",
        }
        self.assertTrue(required.issubset(urls), required - urls)

    def test_alias_and_build_outputs_are_identical(self) -> None:
        expected = (ROOT / "public/Victor_Jimenez_CV.pdf").read_bytes()
        for path in (
            "public/victorjimenezcv.pdf",
            "dist/Victor_Jimenez_CV.pdf",
            "dist/victorjimenezcv.pdf",
        ):
            self.assertEqual(expected, (ROOT / path).read_bytes(), path)

    def test_regeneration_is_byte_identical(self) -> None:
        expected = (ROOT / "public/Victor_Jimenez_CV.pdf").read_bytes()
        spec = importlib.util.spec_from_file_location(
            "generate_cv", ROOT / "scripts/generate_cv.py"
        )
        if spec is None or spec.loader is None:
            self.fail("CV generator could not be loaded")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(expected, module.generate().read_bytes())
        self.assertEqual(expected, module.generate().read_bytes())

    def test_client_identities_are_absent_from_each_cv_alias(self) -> None:
        blocked = set(json.loads((ROOT / "tests/client-identities.json").read_text()))
        for filename in ("Victor_Jimenez_CV.pdf", "victorjimenezcv.pdf"):
            reader = PdfReader(ROOT / "public" / filename)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            self.assertGreater(len(text), 1000)
            self.assertIn("Victor Jimenez", text)
            self.assertIn("Rootstack", text)
            self.assertEqual(text.splitlines().count("Velaio"), 1)
            scanned_text = "\n".join(
                line for line in text.splitlines() if line != "Velaio"
            )
            words = re.findall(r"[a-z0-9]+", scanned_text.lower())
            for width in range(1, 9):
                for start in range(len(words) - width + 1):
                    digest = hashlib.sha256(
                        "".join(words[start : start + width]).encode()
                    ).hexdigest()
                    self.assertNotIn(digest, blocked, filename)

    def test_earlier_employer_role_and_date_attribution(self) -> None:
        expected = [
            ("Ilumno", "Senior Drupal Full Stack Lead Developer", "January 2020 - June 2023"),
            ("Legis", "Senior Drupal Full Stack Lead Consultant", "July 2021 - April 2023"),
            ("Bits Americas", "Drupal Back-End Developer", "January 2018 - July 2021"),
            ("Velaio", "Drupal Full Stack Lead Developer", "January 2015 - January 2018"),
            ("Skena", "Web Developer", "January 2013 - January 2015"),
        ]
        actual = [
            (role["employer"], role["role"], role["dates"])
            for role in self.career["earlier"]
        ]
        self.assertEqual(actual, expected)
        for filename in ("Victor_Jimenez_CV.pdf", "victorjimenezcv.pdf"):
            reader = PdfReader(ROOT / "public" / filename)
            text = normalized(reader.pages[1].extract_text())
            for employer, role, dates in expected:
                self.assertIn(f"{employer} {role} {dates}", text)

    def test_former_employers_are_absent_from_website_content(self) -> None:
        texts = [self.html]
        texts.extend(
            str(path.relative_to(ROOT / "dist")) for path in (ROOT / "dist").rglob("*")
        )
        texts.extend(
            path.read_text()
            for path in (ROOT / "dist").rglob("*")
            if path.suffix in {".js", ".json", ".xml", ".txt", ".svg"}
        )
        for text in texts:
            words = re.findall(r"[a-z0-9]+", text.lower())
            for width in (1, 2, 3):
                for start in range(len(words) - width + 1):
                    digest = hashlib.sha256(
                        "".join(words[start : start + width]).encode()
                    ).hexdigest()
                    self.assertNotIn(digest, EMPLOYER_HASHES)

    def test_changed_contact_numbers_update_pdf_link_targets(self) -> None:
        spec = importlib.util.spec_from_file_location(
            "generate_cv_contacts", ROOT / "scripts/generate_cv.py"
        )
        if spec is None or spec.loader is None:
            self.fail("CV generator could not be loaded")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with TemporaryDirectory(dir=ROOT) as temporary:
            task_root = Path(temporary)
            (task_root / "cv").mkdir()
            (task_root / "public").mkdir()
            data = dict(
                self.career, whatsapp="+44 20 7946 0000", phone="+1 202 555 0142"
            )
            (task_root / "cv/career.json").write_text(json.dumps(data))
            vars(module)["ROOT"] = task_root
            reader = PdfReader(module.generate())
            urls = {
                str(annotation.get_object()["/A"]["/URI"])
                for page in reader.pages
                for annotation in page.get("/Annots", [])
            }
            self.assertIn("https://wa.me/442079460000", urls)
            self.assertIn("tel:+12025550142", urls)
            with self.assertRaises(ValueError):
                module.phone_link("missing", "phone")


if __name__ == "__main__":
    unittest.main()
