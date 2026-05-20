import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { RequireAuth } from '@/lib/auth'
import { SiteShell } from '@/components/layout/SiteShell'
import { ChatWidget } from '@/components/ChatWidget'
import Landing from '@/pages/Landing'
import Jobs from '@/pages/Jobs'
import JobDetail from '@/pages/JobDetail'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import SeekerProfile from '@/pages/seeker/Profile'
import SeekerApplications from '@/pages/seeker/Applications'
import SeekerAlerts from '@/pages/seeker/Alerts'
import RecruiterDashboard from '@/pages/recruiter/Dashboard'
import RecruiterPostJob from '@/pages/recruiter/PostJob'
import RecruiterMyJobs from '@/pages/recruiter/MyJobs'
import RecruiterApplicants from '@/pages/recruiter/JobApplicants'
import Companies from '@/pages/Companies'
import CompanyPage from '@/pages/CompanyPage'
import SalaryGuide from '@/pages/SalaryGuide'
import SalaryGuidesIndex from '@/pages/SalaryGuidesIndex'
import Blog from '@/pages/Blog'
import BlogPost from '@/pages/BlogPost'
import NotFound from '@/pages/NotFound'

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <SiteShell>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/jobs" element={<PageTransition><Jobs /></PageTransition>} />
          <Route path="/jobs/:id" element={<PageTransition><JobDetail /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />

          <Route path="/companies" element={<PageTransition><Companies /></PageTransition>} />
          <Route path="/companies/:slug" element={<PageTransition><CompanyPage /></PageTransition>} />

          <Route path="/salary-guides" element={<PageTransition><SalaryGuidesIndex /></PageTransition>} />
          <Route path="/salary-guides/:role/:city" element={<PageTransition><SalaryGuide /></PageTransition>} />

          <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
          <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />

          <Route
            path="/me/profile"
            element={
              <RequireAuth role="seeker">
                <PageTransition><SeekerProfile /></PageTransition>
              </RequireAuth>
            }
          />
          <Route
            path="/me/applications"
            element={
              <RequireAuth role="seeker">
                <PageTransition><SeekerApplications /></PageTransition>
              </RequireAuth>
            }
          />
          <Route
            path="/me/alerts"
            element={
              <RequireAuth role="seeker">
                <PageTransition><SeekerAlerts /></PageTransition>
              </RequireAuth>
            }
          />

          <Route
            path="/recruiter"
            element={
              <RequireAuth role="recruiter">
                <PageTransition><RecruiterDashboard /></PageTransition>
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter/jobs"
            element={
              <RequireAuth role="recruiter">
                <PageTransition><RecruiterMyJobs /></PageTransition>
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter/jobs/new"
            element={
              <RequireAuth role="recruiter">
                <PageTransition><RecruiterPostJob /></PageTransition>
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter/jobs/:id/applicants"
            element={
              <RequireAuth role="recruiter">
                <PageTransition><RecruiterApplicants /></PageTransition>
              </RequireAuth>
            }
          />

          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
      <ChatWidget />
    </SiteShell>
  )
}
