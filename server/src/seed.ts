import bcrypt from 'bcryptjs'
import { connectDB } from './lib/db.js'
import { User } from './models/User.js'
import { Profile } from './models/Profile.js'
import { Job } from './models/Job.js'
import { Application } from './models/Application.js'
import mongoose from 'mongoose'

async function run() {
  await connectDB()
  console.log('[seed] clearing existing data…')
  await Promise.all([User.deleteMany({}), Profile.deleteMany({}), Job.deleteMany({}), Application.deleteMany({})])

  const passwordHash = await bcrypt.hash('password123', 10)

  console.log('[seed] creating demo users…')
  const recruiter = await User.create({
    email: 'recruiter@zynsource.test',
    passwordHash,
    name: 'Priya Sharma',
    role: 'recruiter',
  })

  const seeker = await User.create({
    email: 'seeker@zynsource.test',
    passwordHash,
    name: 'Arjun Mehta',
    role: 'seeker',
  })

  await Profile.create({
    userId: seeker._id,
    headline: 'Full-stack developer | React + Node.js',
    location: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    experienceYears: 4,
    currentSalaryINR: 1_400_000,
    expectedSalaryINR: 2_000_000,
    skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
    workHistory: [
      {
        company: 'Acme Tech',
        title: 'Software Engineer',
        startDate: '2022-01',
        endDate: 'Present',
        description: 'Building internal tools with React and Node.',
      },
    ],
    education: [{ institution: 'IIT Bombay', degree: 'B.Tech CSE', year: '2021' }],
    openToRemote: true,
  })

  console.log('[seed] creating sample jobs…')
  const baseJob = { recruiterId: recruiter._id, status: 'open' as const, country: 'IN' }
  const jobs = await Job.insertMany([
    {
      ...baseJob,
      title: 'Senior React Engineer',
      company: 'Razorpay',
      city: 'Bengaluru',
      state: 'Karnataka',
      location: 'Koramangala, Bengaluru',
      workMode: 'hybrid',
      jobType: 'full-time',
      experienceMin: 4,
      experienceMax: 8,
      salaryMinINR: 2_500_000,
      salaryMaxINR: 4_500_000,
      skills: ['React', 'TypeScript', 'Redux', 'GraphQL'],
      description:
        'Build payment products used by millions. Own end-to-end features in our merchant dashboard. Strong React + TypeScript fundamentals required.',
    },
    {
      ...baseJob,
      title: 'Backend Engineer (Node.js)',
      company: 'Swiggy',
      city: 'Bengaluru',
      state: 'Karnataka',
      location: 'Embassy Tech Village',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 3,
      experienceMax: 6,
      salaryMinINR: 1_800_000,
      salaryMaxINR: 3_500_000,
      skills: ['Node.js', 'PostgreSQL', 'Kafka', 'AWS'],
      description: 'Design and build APIs powering our delivery network. Experience with high-throughput systems is a plus.',
    },
    {
      ...baseJob,
      title: 'Product Designer',
      company: 'Zerodha',
      city: 'Bengaluru',
      state: 'Karnataka',
      location: 'JP Nagar',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 2,
      experienceMax: 5,
      salaryMinINR: 1_500_000,
      salaryMaxINR: 2_800_000,
      skills: ['Figma', 'UX Research', 'Prototyping'],
      description: 'Design clean, accessible interfaces for retail traders. Strong portfolio and design-thinking required.',
    },
    {
      ...baseJob,
      title: 'Data Scientist',
      company: 'Flipkart',
      city: 'Bengaluru',
      state: 'Karnataka',
      location: 'Bellandur',
      workMode: 'hybrid',
      jobType: 'full-time',
      experienceMin: 3,
      experienceMax: 7,
      salaryMinINR: 2_200_000,
      salaryMaxINR: 4_000_000,
      skills: ['Python', 'PyTorch', 'SQL', 'A/B Testing'],
      description: 'Drive personalization for millions of shoppers. Strong ML fundamentals and production experience required.',
    },
    {
      ...baseJob,
      title: 'DevOps Engineer',
      company: 'Freshworks',
      city: 'Chennai',
      state: 'Tamil Nadu',
      location: 'Olympia Tech Park',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 4,
      experienceMax: 8,
      salaryMinINR: 2_000_000,
      salaryMaxINR: 3_800_000,
      skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD'],
      description: 'Own and scale our infrastructure across multiple regions. Deep Kubernetes and cloud experience expected.',
    },
    {
      ...baseJob,
      title: 'Frontend Developer (Remote)',
      company: 'Postman',
      city: 'Remote',
      state: '',
      location: 'Remote, India',
      workMode: 'remote',
      jobType: 'full-time',
      experienceMin: 2,
      experienceMax: 5,
      salaryMinINR: 1_600_000,
      salaryMaxINR: 3_200_000,
      skills: ['React', 'JavaScript', 'CSS', 'Testing'],
      description: 'Help build the API platform used by 30M+ developers. Fully remote within India.',
    },
    {
      ...baseJob,
      title: 'Engineering Manager',
      company: 'PhonePe',
      city: 'Pune',
      state: 'Maharashtra',
      location: 'Hinjewadi',
      workMode: 'hybrid',
      jobType: 'full-time',
      experienceMin: 8,
      experienceMax: 14,
      salaryMinINR: 5_000_000,
      salaryMaxINR: 9_000_000,
      skills: ['People Management', 'System Design', 'Java', 'Microservices'],
      description: 'Lead a team of 8–12 engineers building merchant payments. Strong technical depth + people leadership required.',
    },
    {
      ...baseJob,
      title: 'Marketing Manager',
      company: 'Cred',
      city: 'Mumbai',
      state: 'Maharashtra',
      location: 'BKC',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 4,
      experienceMax: 8,
      salaryMinINR: 1_800_000,
      salaryMaxINR: 3_500_000,
      skills: ['Performance Marketing', 'SEO', 'Content', 'Analytics'],
      description: 'Own growth campaigns end-to-end. Deep performance marketing experience required.',
    },
    {
      ...baseJob,
      title: 'iOS Engineer',
      company: 'Meesho',
      city: 'Bengaluru',
      state: 'Karnataka',
      location: 'HSR Layout',
      workMode: 'hybrid',
      jobType: 'full-time',
      experienceMin: 3,
      experienceMax: 6,
      salaryMinINR: 2_000_000,
      salaryMaxINR: 3_800_000,
      skills: ['Swift', 'iOS', 'UIKit', 'SwiftUI'],
      description: 'Build the seller and buyer apps used by millions across Bharat.',
    },
    {
      ...baseJob,
      title: 'QA Engineer',
      company: 'Zoho',
      city: 'Hyderabad',
      state: 'Telangana',
      location: 'Hitec City',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 2,
      experienceMax: 5,
      salaryMinINR: 900_000,
      salaryMaxINR: 1_800_000,
      skills: ['Selenium', 'Cypress', 'Manual Testing', 'API Testing'],
      description: 'Ensure quality of our enterprise SaaS suite. Both manual and automation experience welcome.',
    },
    {
      ...baseJob,
      title: 'Talent Acquisition Specialist',
      company: 'TCS',
      city: 'Delhi',
      state: 'Delhi',
      location: 'Connaught Place',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 2,
      experienceMax: 6,
      salaryMinINR: 700_000,
      salaryMaxINR: 1_400_000,
      skills: ['Recruiting', 'LinkedIn', 'Interviewing', 'Sourcing'],
      description: 'Hire technical and non-technical roles across our consulting business. Bulk hiring experience preferred.',
    },
    {
      ...baseJob,
      title: 'Junior Software Developer',
      company: 'Infosys',
      city: 'Pune',
      state: 'Maharashtra',
      location: 'Hinjewadi Phase II',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 0,
      experienceMax: 2,
      salaryMinINR: 350_000,
      salaryMaxINR: 700_000,
      skills: ['Java', 'SQL', 'Spring Boot'],
      description: 'Entry-level role. Strong CS fundamentals and willingness to learn required. Great mentorship environment.',
    },
  ])

  console.log(`[seed] created ${jobs.length} jobs.`)
  console.log('[seed] done.')
  console.log('  Recruiter login: recruiter@zynsource.test / password123')
  console.log('  Seeker login:    seeker@zynsource.test / password123')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('[seed] failed:', err)
  process.exit(1)
})
