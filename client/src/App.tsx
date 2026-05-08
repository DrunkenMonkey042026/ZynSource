import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { RequireAuth } from '@/lib/auth'
import { SiteShell } from '@/components/layout/SiteShell'
import Landing from '@/pages/Landing'
import Jobs from '@/pages/Jobs'
import JobDetail from '@/pages/JobDetail'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import SeekerProfile from '@/pages/seeker/Profile'
import SeekerApplications from '@/pages/seeker/Applications'
import RecruiterDashboard from '@/pages/recruiter/Dashboard'
import RecruiterPostJob from '@/pages/recruiter/PostJob'
import RecruiterMyJobs from '@/pages/recruiter/MyJobs'
import RecruiterApplicants from '@/pages/recruiter/JobApplicants'
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
    </SiteShell>
  )
}
