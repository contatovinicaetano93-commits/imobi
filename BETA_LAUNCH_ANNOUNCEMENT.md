# Imobi Beta Launch Announcement

**Status**: Ready for Release  
**Launch Date**: May 28, 2026  
**Target Production Launch**: Q3 2026  

---

## Welcome to Imobi Beta!

Thank you for being part of the Imobi MVP beta program. We're excited to share our platform for managing construction projects, financial workflows, and stakeholder collaboration.

This beta release represents months of development focused on the core features that construction companies and financial institutions need to streamline project management and capital liberation workflows.

**Your feedback during this beta phase is invaluable** — it will help us refine features, improve performance, and deliver a robust product for general availability.

---

## Quick Start

### Access the Platform
- **Web Application**: https://imobi.vercel.app
- **Test Environment**: All traffic currently routes to production
- **Support Email**: contato.vinicaetano93@gmail.com

### Your Role & Default Credentials

Select your role below to access your test account:

#### Construtora (Constructor/Builder)
You manage construction projects, submit financial requests, and upload project evidence.

**Test Account**:
- Email: `beta-construtora-1@imobi.test`
- Password: `BetaPass123!`
- Access: https://imobi.vercel.app/login

**Key Workflows**:
1. Dashboard overview of all projects
2. Submit parcela (installment) liberation requests
3. Upload KYC documents (CNPJs, certifications)
4. Upload project evidence photos (via S3)
5. Track approval status and audit trail
6. Manage team members and collaborators

---

#### Gestor de Obra (Project Manager)
You oversee daily operations, quality control, and project milestone tracking.

**Test Account**:
- Email: `beta-gestor-1@imobi.test`
- Password: `BetaPass123!`
- Access: https://imobi.vercel.app/login

**Key Workflows**:
1. Monitor project metrics and KPIs
2. Review work completion reports
3. Approve milestone evidence
4. Coordinate with engineers and contractors
5. Generate project reports
6. Track team productivity

---

#### Engenheiro (Engineer)
You validate technical requirements, review designs, and certify construction quality.

**Test Account**:
- Email: `beta-engenheiro-1@imobi.test`
- Password: `BetaPass123!`
- Access: https://imobi.vercel.app/login

**Key Workflows**:
1. Review project technical specifications
2. Certify work completion and quality
3. Inspect evidence photos
4. Approve milestone progress
5. Generate technical reports
6. Validate GPS coordinates for site visits

---

#### Parceiro/Parceira (Partner - Financial Institution)
You evaluate projects, approve financing, and manage capital release decisions.

**Test Account**:
- Email: `beta-parceiro-1@imobi.test`
- Password: `BetaPass123!`
- Access: https://imobi.vercel.app/login

**Key Workflows**:
1. Review project applications
2. Evaluate financial viability
3. Approve/reject capital release requests
4. Monitor project progress
5. Generate risk reports
6. Track capital deployment

---

## Core Features Available in Beta

### 1. Project Management Portal
- Create and configure new construction projects
- Define project milestones and financial phases
- Track progress against timeline
- Geographic mapping of project sites (PostGIS integration)
- Real-time collaboration workspace

### 2. Financial Workflow - Parcela Liberation
The heart of Imobi: streamlined capital release management.

**Process**:
1. Construtora submits parcela liberation request with:
   - Milestone progress evidence
   - KYC document verification
   - Location validation (GPS coordinates)
2. Gestor de Obra reviews and approves
3. Engenheiro validates technical completion
4. Parceiro approves capital release
5. System automatically processes release via async worker
6. Full audit trail recorded

**Technical Details**:
- Validation occurs in two layers: client-side (UX) + server-side (PostGIS)
- Server-side GPS validation is cryptographic and cannot be circumvented
- Async processing via BullMQ ensures reliability
- All decisions recorded immutably

### 3. KYC Document Management
- Upload company documentation (CNPJs, certifications)
- Multi-document workflow support
- Automated validation rules
- Document archival and retrieval

### 4. Evidence Photo Management
- Upload construction site photos as evidence
- AWS S3 integration (file storage)
- Metadata tracking (timestamp, location, uploader)
- Photo gallery and evidence trail

### 5. Approval Audit Trail
- Complete history of all decisions
- Timestamp and actor identification
- Immutable decision records
- Exportable audit reports

### 6. Role-Based Access Control
- Automatic role assignment upon registration
- Feature visibility per role
- API-level authorization
- Workspace separation

---

## API Documentation

If you're integrating with Imobi or building custom workflows:

**API Endpoint**: https://api.imobi.com/api/v1

**Available Documentation**:
- Swagger/OpenAPI: https://api.imobi.com/api/v1/swagger (if enabled)
- Authentication: POST `/auth/registrar` (registration), POST `/auth/login` (login)
- Projects: CRUD operations for projects
- Parcelas: Request and manage financial releases
- Users: User management and KYC data
- PostGIS: Geographic validation endpoints

**SDK/Client Library**:
- Available in `@imbobi/core` package
- Zero native dependencies
- Works in browser and Node.js

---

## Feedback & Bug Reporting

Your feedback is critical to making Imobi better. We want to hear about:
- Feature requests
- UI/UX improvements
- Performance issues
- Bugs and unexpected behavior
- Integration challenges
- Documentation gaps

### Report Issues

1. **Quick Feedback Form**: [Coming Soon - Share feedback link]
2. **Email Support**: contato.vinicaetano93@gmail.com
3. **GitHub Issues**: [If public repo available]

**Include in Bug Reports**:
- What you were trying to do
- What happened instead
- Screenshots or screen recording
- Your role and test account used
- Timestamp of the issue
- Browser/device information

### Expected Response Times
- **Critical Issues** (app broken): 2-4 hours
- **Major Issues** (feature broken): 4-8 hours
- **Minor Issues** (small bug): 24-48 hours
- **Feature Requests**: Next planning cycle

---

## Known Limitations & Future Features

### Currently NOT Available

**Mobile App**
- iOS and Android apps are in development
- Native mobile experience coming in future beta
- Web app is fully mobile-responsive for now

**Advanced Notifications**
- Firebase push notifications for mobile: pending integration
- Email notifications: basic setup only
- SMS notifications: not yet implemented

**Advanced Analytics**
- Detailed financial analytics: coming soon
- Predictive project risk analysis: planned
- Advanced reporting dashboards: in development

**Third-Party Integrations**
- Direct bank connections: not yet implemented
- Accounting software sync: planned
- Document management systems: planned

**Photo Evidence**
- S3 integration active but limited
- Photo cropping/editing tools: planned
- Bulk photo upload: coming soon
- AI-powered photo validation: future feature

**Performance Optimizations**
- Caching strategies being refined
- Database query optimization ongoing
- API response time targets: being tuned

### What We're Monitoring
During beta, we're specifically tracking:
- User experience and usability issues
- Performance under load
- Data accuracy and integrity
- Geographic validation reliability
- Financial workflow correctness
- Role-based access enforcement

---

## System Requirements

### Web Application
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Internet**: Stable connection (DSL, 4G+)
- **Display**: Minimum 1024x768 (responsive to any size)

### Credentials & Access
- **Email**: Valid email address (we don't spam)
- **Password**: Minimum 8 characters, mix of cases and numbers
- **Phone**: Valid phone number for optional SMS alerts

### Geographic Features
- **GPS Validation**: Requires precise coordinates
- **Site Mapping**: Uses PostGIS with Earth spatial data
- **Accuracy**: Validated to within 5-10 meters

---

## Security & Privacy

### Data Protection
- All data encrypted in transit (TLS 1.3)
- Password hashed with bcrypt
- PII stored securely in PostgreSQL
- No sensitive data in logs

### Compliance
- LGPD compliant (Brazilian data protection law)
- Regular security audits planned
- Incident response procedures in place
- Data retention policies documented

### During Beta
- Your data may be reviewed for quality assurance
- We do NOT share data with third parties
- You can request data deletion (LGPD right to be forgotten)
- Privacy Policy: [Link to be added]

---

## Upcoming Maintenance & Downtime

**Planned Maintenance Windows** (Tentative):
- Sundays 2:00-4:00 AM (Brasília Time)
- Database migrations: announced 48 hours before
- Critical updates: deployed with minimal downtime

**Communication**:
- Maintenance notifications via email
- Status page: [To be configured]
- Emergency contacts available 24/7

---

## Beta Program Schedule

| Phase | Dates | Focus | Users |
|-------|-------|-------|-------|
| **Closed Alpha** | May-June 2026 | Core functionality | Team + 5 beta testers |
| **Open Beta** | June-July 2026 | Stability & polish | 50-100 testers (current) |
| **Final Beta** | July-Aug 2026 | Performance & scale | 500+ testers |
| **GA Launch** | Q3 2026 | Full production | Unlimited |

---

## FAQ

**Q: Can I reset my password?**
A: Yes, click "Forgot Password" on login page. (Email reset coming soon)

**Q: How do I change my role?**
A: Contact support with your account email. Role changes may require re-verification.

**Q: Can I use my company's real data?**
A: We recommend using test data during beta for safety. Real data subject to data loss if bugs found.

**Q: What if I find a security vulnerability?**
A: Email security@imobi.com (or equivalent) immediately. Do not publish publicly. We offer responsible disclosure rewards.

**Q: How long will beta last?**
A: Minimum 6-8 weeks, possibly longer depending on feedback and testing results.

**Q: Can I get early GA access?**
A: Active beta testers with good engagement will have priority when GA launches.

**Q: Is there a cost for beta?**
A: No. Beta is free. Pricing for GA will be announced separately.

**Q: Can I share my test account?**
A: Please don't share login credentials. Request additional test accounts instead.

---

## Getting Started Checklist

- [ ] Received beta launch announcement
- [ ] Identified your role (Construtora, Gestor, Engenheiro, Parceiro)
- [ ] Located test account credentials above
- [ ] Navigated to https://imobi.vercel.app/login
- [ ] Successfully logged in with test account
- [ ] Completed onboarding/profile setup
- [ ] Explored main dashboard
- [ ] Reviewed your role-specific features
- [ ] Bookmarked Monitoring Guide for alerts
- [ ] Identified feedback submission method
- [ ] Ready to test core features

---

## Support Contacts

| Need | Channel | Response Time |
|------|---------|----------------|
| Account/Login | contato.vinicaetano93@gmail.com | 24 hours |
| Bug Report | contato.vinicaetano93@gmail.com | 4-48 hours |
| Feature Request | contato.vinicaetano93@gmail.com | Next cycle |
| Security Issue | security@imobi.com | ASAP |
| Emergency | [On-call page] | 15 minutes |

---

## Thank You!

We're grateful for your participation in the Imobi beta program. Your testing, feedback, and real-world usage will directly shape the future of construction project financing.

**Let's build something great together.**

---

**Important**: This is a beta release. Expect bugs, performance issues, and breaking changes. Do not rely on beta for business-critical decisions until GA launch.

**Version**: 0.1.0-beta.1  
**Last Updated**: May 28, 2026  
**Next Update**: June 4, 2026

