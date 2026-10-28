import html
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.models.submission import CodeSubmission


class ReportGenerator:
    def generate_submission_pdf(self, submission: CodeSubmission) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Define modern styles
        title_style = ParagraphStyle(
            name="TitleStyle",
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=12,
            alignment=TA_LEFT
        )
        
        subtitle_style = ParagraphStyle(
            name="SubtitleStyle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=colors.HexColor("#3b82f6"),
            spaceAfter=10,
            spaceBefore=15
        )

        body_style = ParagraphStyle(
            name="BodyStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#475569"),
            leading=14
        )

        code_style = ParagraphStyle(
            name="CodeStyle",
            parent=styles["Normal"],
            fontName="Courier",
            fontSize=8.5,
            textColor=colors.HexColor("#e2e8f0"),
            leading=11
        )

        story = []

        # Header Title
        story.append(Paragraph("Development of Smart Code Inspection Platform with Vulnerability Detection System Group 2 - Security Analysis & PR Review Report", title_style))
        story.append(Spacer(1, 10))

        # Metadata Table
        created_str = submission.created_at.strftime("%Y-%m-%d %H:%M:%S") if submission.created_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        health_score_str = f"{submission.health_score}/100" if submission.health_score is not None else "N/A"
        
        metadata_data = [
            [
                Paragraph("<b>Submission ID:</b>", body_style),
                Paragraph(html.escape(str(submission.id)), body_style)
            ],
            [
                Paragraph("<b>Language / Type:</b>", body_style),
                Paragraph(f"{submission.language.value.upper()} ({submission.submission_type.value.upper()})", body_style)
            ],
            [
                Paragraph("<b>Filename:</b>", body_style),
                Paragraph(html.escape(submission.filename or "pasted_code"), body_style)
            ],
            [
                Paragraph("<b>Code Health Score:</b>", body_style),
                Paragraph(f"<b><font color='#3b82f6'>{health_score_str}</font></b>", body_style)
            ],
            [
                Paragraph("<b>Timestamp:</b>", body_style),
                Paragraph(html.escape(created_str), body_style)
            ]
        ]

        meta_table = Table(metadata_data, colWidths=[130, 410])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('PADDING', (0, 0), (-1, -1), 7),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # PR Summary Executive Section
        pr_sum = submission.pr_summary or {}
        exec_overview = pr_sum.get("executive_overview")
        if exec_overview:
            story.append(Paragraph("Executive Review Overview", subtitle_style))
            story.append(Spacer(1, 4))
            overview_para_style = ParagraphStyle(
                name="OverviewPara",
                parent=body_style,
                fontSize=9.5,
                textColor=colors.HexColor("#334155"),
                leading=13.5
            )
            story.append(Paragraph(html.escape(exec_overview), overview_para_style))
            story.append(Spacer(1, 15))

        # Severity Summary Matrix
        has_findings = hasattr(submission, "findings") and submission.findings
        if has_findings:
            story.append(Paragraph("Severity Summary Matrix", subtitle_style))
            story.append(Spacer(1, 5))
            
            scores = getattr(submission, "severity_scores", None) or {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
            summary_data = [
                [
                    Paragraph("<b>Critical</b>", body_style),
                    Paragraph("<b>High</b>", body_style),
                    Paragraph("<b>Medium</b>", body_style),
                    Paragraph("<b>Low</b>", body_style),
                    Paragraph("<b>Info</b>", body_style)
                ],
                [
                    Paragraph(f"<font color='#ef4444'><b>{scores.get('critical', 0)}</b></font>", body_style),
                    Paragraph(f"<font color='#f97316'><b>{scores.get('high', 0)}</b></font>", body_style),
                    Paragraph(f"<font color='#eab308'><b>{scores.get('medium', 0)}</b></font>", body_style),
                    Paragraph(f"<font color='#3b82f6'><b>{scores.get('low', 0)}</b></font>", body_style),
                    Paragraph(f"<font color='#64748b'><b>{scores.get('info', 0)}</b></font>", body_style),
                ]
            ]
            summary_table = Table(summary_data, colWidths=[108]*5)
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ]))
            story.append(summary_table)
            story.append(Spacer(1, 15))

            # OWASP Top 10 Mapping Section
            owasp_items = pr_sum.get("owasp_mapping") or []
            if owasp_items:
                story.append(Paragraph("OWASP Standard Vulnerability Mapping", subtitle_style))
                story.append(Spacer(1, 5))
                owasp_data = [[
                    Paragraph("<b>OWASP Category</b>", body_style),
                    Paragraph("<b>Flagged Issue</b>", body_style),
                    Paragraph("<b>Risk Level</b>", body_style)
                ]]
                for owasp in owasp_items:
                    owasp_data.append([
                        Paragraph(html.escape(owasp.get("category", "")), body_style),
                        Paragraph(html.escape(owasp.get("finding_title", "")), body_style),
                        Paragraph(f"<b>{html.escape(owasp.get('risk_level', 'High'))}</b>", body_style)
                    ])
                owasp_table = Table(owasp_data, colWidths=[180, 260, 100])
                owasp_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                    ('PADDING', (0, 0), (-1, -1), 6),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ]))
                story.append(owasp_table)
                story.append(Spacer(1, 15))

            # Prioritized Remediation Roadmap Section
            prioritized_fixes = pr_sum.get("prioritized_fix_list") or []
            if prioritized_fixes:
                story.append(Paragraph("Prioritized Remediation Roadmap", subtitle_style))
                story.append(Spacer(1, 5))
                fix_data = [[
                    Paragraph("<b>Priority</b>", body_style),
                    Paragraph("<b>Issue Title</b>", body_style),
                    Paragraph("<b>Recommended Action</b>", body_style)
                ]]
                for fix in prioritized_fixes:
                    p_str = f"Priority {fix.get('priority', 1)}"
                    fix_data.append([
                        Paragraph(f"<b><font color='#3b82f6'>{p_str}</font></b>", body_style),
                        Paragraph(html.escape(fix.get("issue_title", "")), body_style),
                        Paragraph(html.escape(fix.get("action_item", "")), body_style)
                    ])
                fix_table = Table(fix_data, colWidths=[80, 200, 260])
                fix_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                    ('PADDING', (0, 0), (-1, -1), 6),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ]))
                story.append(fix_table)
                story.append(Spacer(1, 15))

            # Detailed Findings & Remediation Recommendations
            story.append(Paragraph("Detailed Findings & Remediation Guidance", subtitle_style))
            story.append(Spacer(1, 5))

            for f in getattr(submission, "findings", []):
                line_str = f"L{f.get('line_number')}" if f.get('line_number') is not None else "Global"
                severity_str = str(f.get('severity', 'info')).upper()
                
                if severity_str == "CRITICAL":
                    sev_color = "#ef4444"
                elif severity_str == "HIGH":
                    sev_color = "#f97316"
                elif severity_str == "MEDIUM":
                    sev_color = "#eab308"
                elif severity_str == "LOW":
                    sev_color = "#3b82f6"
                else:
                    sev_color = "#64748b"
                
                title = html.escape(f.get('title', 'Finding'))
                desc = html.escape(f.get('description', ''))
                category = html.escape(f.get('category', '').replace('_', ' ').title())
                rem_sum = html.escape(f.get('remediation_summary', ''))
                corr_code = f.get('corrected_code', '')
                
                cwe = f.get('cwe_id')
                owasp = f.get('owasp_category')
                meta_info = f" | {html.escape(cwe)}" if cwe else ""
                meta_info += f" | {html.escape(owasp)}" if owasp else ""
                
                finding_header = f"<b>{line_str} - {title}</b> (<font color='{sev_color}'><b>{severity_str}</b></font> | {category}{meta_info})"
                finding_body = f"{desc}<br/><br/><b>Remediation Recommendation:</b> {rem_sum}"
                
                f_data = [
                    [Paragraph(finding_header, body_style)],
                    [Paragraph(finding_body, body_style)]
                ]
                
                if corr_code:
                    f_data.append([Preformatted(corr_code, code_style)])
                
                f_table = Table(f_data, colWidths=[540])
                f_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                    ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#ffffff")),
                    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#0f172a")) if len(f_data) > 2 else ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#ffffff")),
                    ('PADDING', (0, 0), (-1, -1), 8),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ]))
                story.append(f_table)
                story.append(Spacer(1, 10))


        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    def generate_submission_markdown(self, submission: CodeSubmission) -> str:
        created_str = submission.created_at.strftime("%Y-%m-%d %H:%M:%S") if submission.created_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        health_score_str = f"{submission.health_score}/100" if submission.health_score is not None else "N/A"
        
        md = []
        md.append("# Development of Smart Code Inspection Platform with Vulnerability Detection System Group 2 - Security Analysis & PR Review Report\n")
        md.append(f"- **Submission ID:** `{submission.id}`")
        md.append(f"- **Language / Type:** {submission.language.value.upper()} ({submission.submission_type.value.upper()})")
        md.append(f"- **Filename:** {submission.filename or 'pasted_code'}")
        md.append(f"- **Code Health Score:** **{health_score_str}**")
        md.append(f"- **Timestamp:** {created_str}\n")
        
        pr_sum = submission.pr_summary or {}
        exec_overview = pr_sum.get("executive_overview")
        if exec_overview:
            md.append("## Executive Review Overview\n")
            md.append(f"{exec_overview}\n")
            
        scores = getattr(submission, "severity_scores", None) or {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        md.append("## Severity Breakdown Matrix\n")
        md.append("| Critical | High | Medium | Low | Info |")
        md.append("|---|---|---|---|---|")
        md.append(f"| {scores.get('critical', 0)} | {scores.get('high', 0)} | {scores.get('medium', 0)} | {scores.get('low', 0)} | {scores.get('info', 0)} |\n")

        owasp_items = pr_sum.get("owasp_mapping") or []
        if owasp_items:
            md.append("## OWASP Standard Vulnerability Mapping\n")
            md.append("| OWASP Category | Flagged Issue | Risk Level |")
            md.append("|---|---|---|")
            for owasp in owasp_items:
                md.append(f"| {owasp.get('category', '')} | {owasp.get('finding_title', '')} | {owasp.get('risk_level', '')} |")
            md.append("")

        prioritized_fixes = pr_sum.get("prioritized_fix_list") or []
        if prioritized_fixes:
            md.append("## Prioritized Remediation Roadmap\n")
            md.append("| Priority | Issue Title | Recommended Action |")
            md.append("|---|---|---|")
            for fix in prioritized_fixes:
                md.append(f"| Priority {fix.get('priority', 1)} | {fix.get('issue_title', '')} | {fix.get('action_item', '')} |")
            md.append("")

        findings = getattr(submission, "findings", []) or []
        if findings:
            md.append("## Detailed Findings & Remediation Guidance\n")
            for f in findings:
                line_str = f"L{f.get('line_number')}" if f.get('line_number') is not None else "Global"
                title = f.get('title', 'Finding')
                sev = str(f.get('severity', 'info')).upper()
                cat = f.get('category', '').replace('_', ' ').title()
                cwe = f" | {f.get('cwe_id')}" if f.get('cwe_id') else ""
                owasp = f" | {f.get('owasp_category')}" if f.get('owasp_category') else ""
                
                md.append(f"### [{line_str}] {title} ({sev} - {cat}{cwe}{owasp})\n")
                md.append(f"**Description:** {f.get('description', '')}\n")
                if f.get('remediation_summary'):
                    md.append(f"**Remediation Recommendation:** {f.get('remediation_summary')}\n")
                if f.get('corrected_code'):
                    code_lang = submission.language.value if submission.language else 'text'
                    md.append(f"```{code_lang}\n{f.get('corrected_code')}\n```\n")
                if f.get('best_practice_explanation'):
                    md.append(f"> **Best Practice:** {f.get('best_practice_explanation')}\n")


        return "\n".join(md)

    def generate_submission_json(self, submission: CodeSubmission) -> dict:
        return {
            "id": str(submission.id),
            "language": submission.language.value,
            "filename": submission.filename,
            "health_score": submission.health_score,
            "status": submission.status.value if submission.status else "completed",
            "created_at": submission.created_at.isoformat() if submission.created_at else None,
            "severity_scores": submission.severity_scores or {},
            "pr_summary": submission.pr_summary or {},
            "findings": submission.findings or [],
            "full_remediated_code": (submission.pr_summary or {}).get("full_remediated_code"),
            "source_code": submission.source_code
        }


report_generator = ReportGenerator()

