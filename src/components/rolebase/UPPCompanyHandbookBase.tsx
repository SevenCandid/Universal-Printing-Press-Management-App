'use client'

import { useState, useEffect } from 'react'
import { 
  BookOpenIcon, 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookmarkIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CameraIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline'

interface Section {
  id: string
  title: string
  icon: any
  subsections?: { id: string; title: string }[]
}

const sections: Section[] = [
  { id: 'welcome', title: '1. Welcome & Acknowledgment', icon: BookOpenIcon },
  { id: 'mission', title: '4-7. Mission, Vision, Values & Objectives', icon: ShieldCheckIcon },
  { id: 'employment', title: '8-10. Employment & Categories', icon: UserGroupIcon },
  { id: 'roles', title: '11-15. Employee Roles', icon: UserGroupIcon },
  { id: 'performance', title: '16. Performance Review', icon: BookOpenIcon },
  { id: 'conduct', title: '17. Employee Conduct', icon: ShieldCheckIcon },
  { id: 'cctv', title: '18. CCTV Policy', icon: CameraIcon },
  { id: 'camera', title: '19. Canon 800D Policy', icon: CameraIcon },
  { id: 'accounting', title: '20. Accounting & Finance', icon: CurrencyDollarIcon },
  { id: 'computer', title: '21. Computer Use Policy', icon: ComputerDesktopIcon },
  { id: 'commission', title: '22. Commission Agreement', icon: DocumentTextIcon },
  { id: 'phone', title: '23. Business Phone Policy', icon: DevicePhoneMobileIcon },
  { id: 'motorbike', title: '24. Motorbike Use Policy', icon: TruckIcon },
  { id: 'procurement', title: '25. Procurement & Payment', icon: ShoppingBagIcon },
]

export default function UPPCompanyHandbookBase({ role }: { role: string }) {
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState('welcome')
  const [showMobileTOC, setShowMobileTOC] = useState(false)

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    )
  }

  const scrollToSection = (sectionId: string) => {
    console.log('Scrolling to section:', sectionId)
    setActiveSection(sectionId)
    setShowMobileTOC(false)
    
    // Small delay to ensure DOM is ready and mobile menu closes
    setTimeout(() => {
      const element = document.getElementById(sectionId)
      if (element) {
        console.log('Element found:', element)
        // Use scrollIntoView with the scroll-margin-top from CSS (scroll-mt-20 = 5rem = 80px)
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      } else {
        console.warn(`Section with ID "${sectionId}" not found`)
      }
    }, 200) // Slightly longer delay for mobile menu animation
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]')
      let current = ''

      sections.forEach((section) => {
        const element = section as HTMLElement
        const rect = element.getBoundingClientRect()
        if (rect.top <= 100) {
          current = element.id
        }
      })

      if (current) {
        setActiveSection(current)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-responsive py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <DocumentTextIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <span>UPP Company Handbook & Policies</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Universal Printing Press Employee Handbook and Company Policies
              </p>
            </div>
            <button
              onClick={() => setShowMobileTOC(!showMobileTOC)}
              className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Toggle table of contents"
            >
              <BookOpenIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="container-responsive py-4 md:py-6">
        {/* Mobile TOC Overlay */}
        {showMobileTOC && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
            onClick={() => setShowMobileTOC(false)}
          />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table of Contents - Sidebar */}
          <div className={`lg:col-span-1 ${
            showMobileTOC 
              ? 'fixed inset-y-0 left-0 w-80 max-w-[85vw] z-40 transition-transform duration-300 ease-out translate-x-0' 
              : 'hidden'
          } lg:block lg:relative lg:w-auto lg:translate-x-0`}>
            <div className={`h-full lg:sticky lg:top-16 bg-card border border-border ${
              showMobileTOC ? 'lg:rounded-lg' : 'rounded-lg'
            } p-3 md:p-4 max-h-screen lg:max-h-[calc(100vh-80px)] overflow-y-auto shadow-2xl lg:shadow-none`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border sticky top-0 bg-card z-10">
                <h2 className="text-sm font-semibold text-foreground flex items-center">
                  <BookmarkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Table of Contents</span>
                </h2>
                <button
                  onClick={() => setShowMobileTOC(false)}
                  className="lg:hidden p-1 hover:bg-accent rounded transition-colors"
                  aria-label="Close menu"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
              <nav className="space-y-1 pt-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center justify-start px-2 md:px-3 py-2 text-xs md:text-sm rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <section.icon className="h-4 w-4 flex-shrink-0 mr-2" />
                    <span className="truncate text-left">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-lg p-4 md:p-8">
              {/* Welcome & Acknowledgment */}
              <section id="welcome" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">1.0 Welcome Note to Employees</h2>
                <p className="text-muted-foreground mb-4">
                  Welcome to UPP LTD. We hope you enjoy your time with us as we strive to provide the best customer care in digital printing services.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">2.0 Employee Acknowledgment Form</h3>
                <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    I acknowledge receipt of the employee Handbook. I agree to read it carefully and thoroughly. I agree to seek clarification to any of the policies therein from my supervisor if I do not understand. I understand that I am an "at will" employee and therefore may be terminated by either part, with or without cause, and without prior notice. Return Handbook to organization at the end of employment.
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    I understand that nothing contained in the Employment Handbook may be construed as creating a promise of future benefits or a binding contract with UPP LTD services for benefits or any other purpose. I also understand that these policies and procedures are continually evaluated and may be amended, modified or terminated at any time.
                  </p>
                  <div className="space-y-3 mt-4">
                    <div className="border-b border-border pb-2">
                      <p className="text-sm font-medium">Sign:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-sm font-medium">Name:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Date:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold mt-6 mb-3">3.0 Introduction to Employee Handbook</h3>
                <p className="text-muted-foreground mb-4">
                  This Handbook is not a contract or a legal document. It is written to provide the employee with the "dos" and "don'ts" of the company. Much as every effort is made to represent in this policy most, if not all, the rules and responsibilities of the employee, the company will continue to implement changes as may deem profitable and beneficial to make it the leader in the digital printing business. This is a mutual employment agreement and either the employee or company may terminate employment at will or without cause and at any time.
                </p>
              </section>

              {/* Mission, Vision & Values */}
              <section id="mission" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">4.0 Our Mission Statement</h2>
                <p className="text-muted-foreground mb-6">
                  To provide creative Printing, Marketing and Educational Solutions to our customers.
                </p>

                <h2 className="text-2xl md:text-3xl font-bold mb-4">5.0 Our Vision</h2>
                <p className="text-muted-foreground mb-6">
                  To become universally recognized as the most trusted provider of creative printing, marketing, and educational solutions in Jaman North District and beyond.
                </p>

                <h2 className="text-2xl md:text-3xl font-bold mb-4">6.0 Our Values</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We put our customers first. We believe in the philosophy of the "customer is always right."</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Integrity.</strong> We operate with integrity and strive to earn your trust always.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Respect.</strong> At universal printing press we treat all our customers with a great deal of respect irrespective of gender, religion, and political affiliations.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Giving back.</strong> We believe in giving back to the community through the sharing of ideas, promoting locally manufactured products and services.</span>
                  </li>
                </ul>

                <h2 className="text-2xl md:text-3xl font-bold mb-4 mt-8">7.0 Strategic Objectives</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We shall be the market leader in acquiring new printing equipment.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We shall provide printing services in a timely manner at all times.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We shall maximize profitability by reducing non-value-added activities and increase our customer base.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We shall always ensure quality printing services to our customers by actively soliciting and implementing feedback.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We shall provide and maintain a highly skilled workforce through regular in-service training.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We shall ensure a low employee turnover through the provision of an open-door policy in settling grievances.</span>
                  </li>
                </ul>
              </section>

              {/* Employment */}
              <section id="employment" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">8.0 Employment</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Employment shall be opened to everyone with preference to the unemployed educated youth.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Relatives have equal opportunities as non-relatives to be hired. There shall not be a preferential treatment.</span>
                  </li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">9.0 Conflict of Interest</h3>
                <p className="text-muted-foreground mb-4">
                  An employee of this company shall not directly or indirectly conduct business with other printing service providers herein called competitors without the prior approval of management.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">10.0 Employment Categories</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• General Manager</li>
                  <li>• Chief Graphic Designer</li>
                  <li>• Office Manager</li>
                  <li>• Computer Engineer</li>
                </ul>
              </section>

              {/* Employee Roles */}
              <section id="roles" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">11.0 Employee Roles</h2>

                <div className="space-y-6">
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3">Role of the General Manager</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• The general manager is the chief supervisor of the company.</li>
                      <li>• The general manager is next in command to the Chief Executive Officer and shall notify the latter of any key decisions he/she plans to undertake.</li>
                      <li>• The general manager is responsible for all aspects of the business, including daily operations, administrative functions, and finances.</li>
                      <li>• Due to the enormity of this task, the general manager shall practice effective delegation of duties to the office manager, graphic designer and all other employees and volunteers of the company.</li>
                      <li>• The general manager shall keep daily records of pending orders and ensure expeditious completion of all orders.</li>
                      <li>• The general manager shall give specific directions to each employee of the company.</li>
                      <li>• As part of this supervision, the general manager shall oversee the hiring, training, and coaching of all employees of the company.</li>
                      <li>• The general manager shall be responsible for budgeting resources, for marketing, supplies, and equipment.</li>
                      <li>• The general manager shall lay out incentives for all employees and assess the efficiency of each section of the company while offering strategic plans for the business based on company goals.</li>
                      <li>• To function effectively and achieve above goals, the general manager shall collaborate with the Chief Executive Officer, the Board of Directors and with the employees that they supervise.</li>
                    </ul>
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">The following shall have negative consequences on the General manager:</p>
                      <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                        <li>• Team is not producing results</li>
                        <li>• Morale of employees is low</li>
                        <li>• Employees keep getting fired</li>
                        <li>• Employees keep quitting</li>
                        <li>• Employees keep complaining</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3">Role of the Graphic Designer</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Create and design various materials for print and digital</li>
                      <li>• Ensure projects are completed with high quality and on schedule</li>
                      <li>• Establish creative direction for the company as well as brand guidelines</li>
                      <li>• Prioritize and manage multiple projects within design specifications and budget restrictions</li>
                      <li>• Perform retouching and manipulation of images</li>
                      <li>• Director of photography</li>
                      <li>• Responsible for the design of our Newsletter</li>
                      <li>• Assist in pricing of services and products</li>
                      <li>• Ensures that all machines and devices are operating 100%</li>
                      <li>• Will train fellow colleagues on how to operate less technical aspects of the machines</li>
                    </ul>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3">Role of the Bookkeeper/Office Manager</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Shall see to it that all business activities in the office are running smoothly</li>
                      <li>• Shall work with the General Manager and rest of employees to keep the inventory UpToDate</li>
                      <li>• Shall ensure that all business transactions are properly documented</li>
                      <li>• Shall receive all payments of money, physical or via mobile</li>
                      <li>• Shall be responsible for depositing all monies to company's accounts</li>
                      <li>• Shall be responsible for issuing receipts of payments to all customers for purchases or services</li>
                      <li>• Shall reach out to promote the products and services of the company</li>
                      <li>• Shall work with the General manager to obtain feedback from all customers to ensure we provide the customer quality service</li>
                      <li>• Shall be accountable to the General Manager and shall render daily accounts to him/her</li>
                    </ul>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3">Role of Computer Engineer</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Shall work hand in hand with the graphic designer in the execution of the latter's duties</li>
                      <li>• Shall be responsible for creating and integrating computer systems to meet the demands of the organization</li>
                      <li>• Shall be responsible for the social media page of the company</li>
                      <li>• Shall work with the general manager in meeting all the educational needs of the company</li>
                    </ul>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3">15.0 Responsibilities of the Managing Director / Marketing Director of Universal Printing Press (UPP)</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                      <li>• Shall oversee promotion and advertising efforts to drive sales and build brand awareness.</li>
                      <li>• Shall develop an overall marketing plan, approve campaigns and measure the return on investment of various advertising methods.</li>
                      <li>• Shall undertake market research and understand the trends and customer preferences.</li>
                      <li>• Shall create marketing strategy and budgets.</li>
                      <li>• Shall oversee the creation of marketing materials and content.</li>
                      <li>• Shall perform all other relevant tasks essential for increasing the business's sales.</li>
                      <li>• Shall be answerable to the General Manager/CEO.</li>
                    </ul>
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">The following shall have negative consequences on the Marketing Director, and this includes job termination:</p>
                      <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                        <li>• Assigned projects are consistently not producing results.</li>
                        <li>• Customers not satisfied with finished products.</li>
                        <li>• Consistently not meeting marketing and sales goals.</li>
                        <li>• Inappropriate use of UPP resources and for personal benefits.</li>
                        <li>• Any activity that does not serve to promote the growth of UPP.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Performance Review */}
              <section id="performance" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">16.0 Performance Review</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Each employee's performance shall be evaluated monthly by the manager of the company in consultation with the CEO of the company.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>In the event of a "below average" performance, all effort shall be made to train such employee.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Verbal warning shall be given before a written dismissal note if indicated.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>A "below average" shall be determined by the manager in consultation with the CEO of the company.</span>
                  </li>
                </ul>
              </section>

              {/* Employee Conduct */}
              <section id="conduct" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">17.0 Employee Conduct</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Employees shall conduct themselves in a manner that is fair and approved by our customers and in accordance with all the guidelines of this company.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Any action of an employee that in any way goes to tarnish the name of this company or is suggestive of thievery shall be subject to instant investigation and punishable by summary dismissal.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Such an employee may be denied payment for that pay period if found to be liable for the offense committed.</span>
                  </li>
                </ul>
              </section>

              {/* CCTV Policy */}
              <section id="cctv" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">18.0 Closed Circuit Television (CCTV) Camera Use Policy</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-3">1. Purpose</h3>
                <p className="text-muted-foreground mb-4">
                  Universal Printing Press CCTV Cameras usage policy outlines the guidelines for proper monitoring and recording of workplace activities.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">2. Aims</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• To provide workplace surveillance</li>
                  <li>• To protect all employees and non-employees</li>
                  <li>• To protect equipment and buildings</li>
                  <li>• To assist in the investigation of criminal activities</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">3. Scope</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The CCTV cameras will be placed in the workplace only.</li>
                  <li>• The monitoring and recording will strictly adhere to the privacy laws of Ghana.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">4. Usage</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The CCTV cameras usage policy applies to all employees and other individuals like partners, volunteers as well as those whose activities bring them to the company's facility.</li>
                  <li>• Wrongful use of the CCTV cameras shall be fully investigated by the leadership of the organization.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">5. Monitoring</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The CCTV cameras shall be installed only in locations that provide adequate surveillance of the workplace equipment and building.</li>
                  <li>• The CCTV cameras must always be turned on.</li>
                  <li>• The CCTV cameras must always monitor and record the workplace activities, equipment and building during and after office hours.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">6. Accessibility</h3>
                <p className="text-muted-foreground mb-4">
                  Accessing the CCTV cameras remotely should be done sparingly and for legitimate reasons due to the significant internet connection charges.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">7. Analysis</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The CCTV cameras must be downloaded regularly and analyzed by the General Manager and the rest of the team.</li>
                  <li>• All findings shall be discussed with the CEO.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">8. Consequences for violating this policy</h3>
                <p className="text-muted-foreground">
                  Employees or non-employees who intentionally tamper with the CCTV cameras to render them dysfunctional will face disciplinary action and/or legal actions depending on the nature and severity of the violation(s).
                </p>
              </section>

              {/* Canon 800D Policy */}
              <section id="camera" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">19.0 Canon 800D Use Policy</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-3">1. Purpose</h3>
                <p className="text-muted-foreground mb-4">
                  Universal Printing Press Canon 800D camera usage policy. This policy outlines the guidelines for proper use of the camera. The aim of this company policy is to avoid inappropriate, and unauthorized use of the camera.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">2. Scope</h3>
                <p className="text-muted-foreground mb-4">
                  This camera usage policy applies to all employees and other individuals who may have access to the camera.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">3. Usage</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The camera shall be used to take pictures of people, places, events, and objects</li>
                  <li>• Employees should not assume that the camera is for personal use.</li>
                  <li>• Employees should not use the camera without proper authorization.</li>
                  <li>• The camera should always be in the camera bag when not in use</li>
                  <li>• Protect the camera from damage</li>
                  <li>• Keep the camera from getting wet</li>
                  <li>• Always keep the lens clean</li>
                  <li>• Avoid dropping the camera</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">4. Outside work</h3>
                <p className="text-muted-foreground mb-3">The camera shall not be taken outside of Sampa unless prior approval by management. If the camera must be taken outside of Sampa then all the following criteria must be met:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Location for the photoshoot</li>
                  <li>• Job type</li>
                  <li>• Duration of use camera</li>
                  <li>• Amount</li>
                  <li>• Down payment</li>
                  <li>• Signed verbal or written consent</li>
                  <li>• Name of person responsible for taking the camera outside of town</li>
                  <li>• Frequent update of General or office Manager on progress while away with the camera</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">5. Monitoring</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The company has the right to regularly monitor all uses of the camera.</li>
                  <li>• They should not engage in other activities that put the camera at risk of damage</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">6. Consequences for Being Non-Compliant</h3>
                <p className="text-muted-foreground mb-4">
                  Employees who violate this camera usage policy will face disciplinary action. A warning will follow violations. Depending on the severity of the violation, the employee can face termination of employment or other legal actions.
                </p>
              </section>

              {/* Accounting & Finance */}
              <section id="accounting" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">20.0 Accounting and Finance Policies & Guidelines</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-3">1. Purpose</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The following internal controls are put in place for cash collections, prevent mishandling of funds and to safeguard against loss.</li>
                  <li>• Any employee with responsibilities for managing Universal Printing Press cash receipts or entrusted with the billing/invoicing, receipt, deposit and reconciliation of cash and cash related activities should follow this policy.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">2. Capital Assets</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Properly identify, record, and track all capital assets at Universal Printing Press.</li>
                  <li>• Record the model, serial numbers and assign asset ID numbers to help identify and track all equipment.</li>
                  <li>• Keep a complete accurate and timely audit schedules for all equipment.</li>
                  <li>• Notify the Chief Executive Officer of all changes in the status of equipment in real time. This includes, but is not limited to, assets that need repairs, stolen, or lost.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">3. Cash Handling</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Proper bookkeeping is needed for all transactions.</li>
                  <li>• All transactions must be accompanied by receipts of payment.</li>
                  <li>• Each equipment must have its separate income and expenditure properly documented on a spreadsheet and in a cashbook.</li>
                  <li>• At a minimum, the following information will be recorded for each business transaction: Date, name and phone number of customer, type of job, quantity, amount received, employee responsible for the transaction/documentation.</li>
                  <li>• All cash generated must be deposited in the Business account on the Friday of every week.</li>
                  <li>• All cash withdrawals must be done through the Chief Executive Officer only.</li>
                  <li>• Periodic reviews of cash handling procedures will be conducted by an Accountant.</li>
                  <li>• Anyone found to not be complying with approved procedures may lose the privilege to handling cash.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">4. Contracting Authority</h3>
                <p className="text-muted-foreground mb-4">
                  The CEO will delegate authority for signing agreements and contracts.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">5. Financial Review & Reconciliation</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• All transactions will be reviewed monthly to ensure that our net margin of benefit is at least 10%</li>
                  <li>• Quarterly Accounting and Financial Reporting for each equipment should be timely to ensure that financial information accurately reflects actual activity</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">6. Purchases</h3>
                <p className="text-muted-foreground mb-3">All purchases made without the knowledge of the CEO must be properly documented to include the following:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• What was purchased</li>
                  <li>• Where it was purchased</li>
                  <li>• When it was purchased</li>
                  <li>• Team must also be able to explain why it was purchased if requested</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  Any conflict of interest in making a purchase shall be thoroughly investigated and the perpetrator held accountable for all economic loss. All purchases must be discussed with the general manager and Chief Executive Officer either directly or via phone/text message.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">7. Fraud Prevention</h3>
                <p className="text-muted-foreground mb-3">Financial fraud includes, but is not limited to:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Misappropriation of Universal Printing Press funds or property.</li>
                  <li>• Authorizing or receiving compensation or reimbursement for goods not received or services not performed.</li>
                  <li>• Falsification of work records.</li>
                  <li>• Unauthorized alteration of financial records.</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  Anyone found to have engaged in a fraudulent activity will lose the privilege to handling cash and may be summarily dismissed from the company.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">8. Payroll Policies</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The CEO shall establish parameters for extra compensation amounts.</li>
                  <li>• Each employee must open an account with GCB Bank.</li>
                  <li>• All salaries shall be paid electronically into employees' account.</li>
                  <li>• All salaries shall be paid on the 30th of the Month except in February when payment shall be on the 28th/29th.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">9. Bank Account</h3>
                <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Bank Name:</strong> GCB Bank</li>
                    <li>• <strong>Account Name:</strong> Daniel Adu</li>
                    <li>• <strong>Account Type:</strong> Savings</li>
                    <li>• <strong>Account number:</strong> 7231010021670</li>
                    <li>• <strong>Branch Name:</strong> Sampa</li>
                  </ul>
                </div>
              </section>

              {/* Computer Use Policy */}
              <section id="computer" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">21.0 Computer Use Policy</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-3">1. Purpose</h3>
                <p className="text-muted-foreground mb-4">
                  Universal Printing Press computer usage policy outlines the guidelines for properly using its computers, network, and internet. The aim of this company policy is to avoid inappropriate, illegal, and unauthorized use of the computing equipment and information technology, and to avoid jeopardizing the company's reputation and security.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">2. Scope</h3>
                <p className="text-muted-foreground mb-4">
                  This computer usage policy applies to all employees and other individuals like partners, volunteers, and those who have access to the company's network and computing facilities.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">3. Policy</h3>
                <p className="text-muted-foreground mb-3">Employees are expected to use computer devices, the internet, and company computer network to:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Work on their job responsibilities.</li>
                  <li>• Do work-related research.</li>
                  <li>• Use the email system and social media only for work-related purposes.</li>
                </ul>
                <p className="text-muted-foreground mb-3">Employees are expected to:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Use secure passwords and keep their user ID information private.</li>
                  <li>• Not connect their personal computers to the company's computer system.</li>
                  <li>• Not give their computer login information to others or grant them unauthorized access to the company's computer system.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">4. Abuse of Policy and Inappropriate Computer Usage</h3>
                <p className="text-muted-foreground mb-3">Employees should not use the company's computers to:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Send confidential information to unauthorized user accounts.</li>
                  <li>• Download or upload illegal files or spread illegally copyrighted materials.</li>
                  <li>• Invade others' privacy, corporate accounts, and email communication.</li>
                  <li>• Visit unsafe websites that can crash the system or spread a virus in the company's network.</li>
                  <li>• Engage in hacking activities, steal personal or financial information, mine cryptocurrencies, buy/sell illegal goods.</li>
                  <li>• Turn off the computer's firewalls or antivirus programs without a system administrator or a manager's permission.</li>
                  <li>• Electronic media should not be used for transmitting email spam.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">5. Usage</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The computer devices should only be used for business-related purposes, and employees should not abuse computer data usage limits.</li>
                  <li>• Additionally, network access will be granted to authorized user accounts only.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">6. Monitoring</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The company has the right to regularly monitor all electronic communication channels that happen on business computing devices. These include email accounts and other forms of communication and data sharing that occur on work on computers.</li>
                  <li>• The company uses this information to increase the efficiency of its operations and improve employee productivity.</li>
                  <li>• Employees should not assume that the communication on these devices is exclusively private and should not use them to transmit private messages or personal data.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">7. Security</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Employees should not give their authorized access information to users without proper authorization.</li>
                  <li>• They should not try to obtain other employees' password information, hack into other networks, or engage in other activities that put the company's system security at risk.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">8. Consequences for Being Non-Compliant</h3>
                <p className="text-muted-foreground mb-3">
                  Employees who violate this computer usage policy will face disciplinary action. A warning will follow violations. Depending on the severity of the violation, the employee can face termination of employment or other legal actions.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">9. Examples of severe violations are:</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The usage of computer devices to engage in any sort of illegal activity.</li>
                  <li>• Activities that spread malware like viruses, worms, and Trojan horses.</li>
                  <li>• Spreading discriminatory, offensive, or harassing messages. There's a zero-tolerance policy on any kind of harassing and discriminatory communication that can be associated with the company.</li>
                </ul>
              </section>

              {/* Commission Agreement */}
              <section id="commission" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">22.0 Universal Printing Press Commission Agreement</h2>
                <p className="text-muted-foreground mb-4">
                  The following agreement on the payment of commission has been entered into on this date between:
                </p>

                <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2"><strong>A. Universal Printing Press</strong></p>
                      <p className="text-sm text-muted-foreground">Located on the 2nd floor of Awurade Na Aye Storey Building</p>
                      <p className="text-sm text-muted-foreground">Business Registration No: CS008880122, TIN: C006152414X</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2"><strong>B. Employee Details</strong></p>
                      <div className="space-y-2">
                        <div className="border-b border-border pb-2">
                          <p className="text-sm font-medium">Name:</p>
                          <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                        </div>
                        <div className="border-b border-border pb-2">
                          <p className="text-sm font-medium">Job Title: Office Manager of Universal Printing Press</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Start Date:</p>
                          <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2"><strong>C. Commission Rate</strong></p>
                      <div className="border-b border-border pb-2">
                        <p className="text-sm font-medium">Amount: ……… per month</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">All payment shall be made to the GCB Bank account of employee</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2"><strong>RIGHTS</strong></p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><strong>D.</strong> The above-named employee shall be entitled to this commission if they perform their respective duties as stipulated in the Universal Printing Press Policy.</li>
                        <li><strong>E.</strong> The commission shall be reviewed from time to time per management.</li>
                        <li><strong>F.</strong> Each time the commission is reviewed, a new agreement form shall be signed to that effect.</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-sm font-medium mb-2">Employee signature:</p>
                        <div className="h-12 border-b-2 border-dashed border-muted-foreground mb-2"></div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Date:</p>
                            <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-1"></div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Time:</p>
                            <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-1"></div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">CEO signature:</p>
                        <div className="h-12 border-b-2 border-dashed border-muted-foreground mb-2"></div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Date:</p>
                            <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-1"></div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Time:</p>
                            <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Business Phone Policy */}
              <section id="phone" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">23.0 Business Phone Use Policy</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-3">1. Purpose</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Universal Printing Press Business phone usage policy outlines the guidelines for properly using the business phone</li>
                  <li>• The aim of this company policy is to avoid inappropriate, illegal, and unauthorized use of the business phone</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">2. Scope</h3>
                <p className="text-muted-foreground mb-4">
                  This business phone usage policy applies to all employees and other individuals like partners, volunteers, and those who have access to the company's business phone.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">3. Policy</h3>
                <p className="text-muted-foreground mb-3">Employees are expected to use the business phone in the following scenarios:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Conduct all business activities both within and outside of town</li>
                  <li>• Do work-related activities while in the office</li>
                  <li>• Address all social media activities related to the company</li>
                </ul>
                <p className="text-muted-foreground mb-3">Employees should not use the business phone to:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Send confidential information to unauthorized persons</li>
                  <li>• Download or upload unsafe, illegal files or spread illegally copyrighted materials</li>
                  <li>• Invade others' privacy, corporate accounts, and email communication</li>
                  <li>• Visit unsafe websites that can crash the phone or allow others to have access to the business data</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">4. Monitoring</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The company has the right to regularly monitor all phone call activities</li>
                  <li>• Employees should not assume that the communication on the business phone is exclusively private and should not use them to transmit private messages or personal data</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">5. Security</h3>
                <p className="text-muted-foreground mb-4">
                  Employees should not give the password or authorized access information to customers without proper authorization.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">6. Consequences for Being Non-Compliant</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Employees who violate this business phone usage policy will face disciplinary action</li>
                  <li>• A warning will follow violations</li>
                  <li>• Depending on the severity of the violation, the employee can face termination of employment or other legal actions.</li>
                </ul>
              </section>

              {/* Motorbike Use Policy */}
              <section id="motorbike" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">24.0 Universal Printing Press Motorbike Use Policy</h2>
                <p className="text-muted-foreground mb-4">
                  The following is the complete motorbike use policy of Universal Printing Press regarding its employees who may be granted the use of the company motorbike as per their job duties.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">Policy Details</h3>
                <p className="text-muted-foreground mb-3">An employee of Universal Printing Press may be granted a company motorbike if they meet the following criteria:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The need to travel outside of Sampa to meet with customers or vendors.</li>
                  <li>• A company motorbike is indispensable to complete their daily job, such as marketing or delivery of products.</li>
                  <li>• If an agreement was reached between the CEO and employee for that specific task outside of above.</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  The CEO has the final say in which transaction the motorbike can be used. An employee who has Universal Printing Press motorbike is required to always abide by the motorbike policy. The CEO has the right to revoke the right of an employee to use the company's motorbike at his discretion.
                </p>

                <h3 className="text-xl font-semibold mt-4 mb-3">Prerequisite to riding UPP motorbike</h3>
                <p className="text-muted-foreground mb-3">Employees of UPP are only allowed to ride a company motorbike if they:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Hold a valid motorbike rider's license.</li>
                  <li>• They sign a document indicating that they will abide by this policy.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">Obligation of the motorbike rider</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Always wear a motorbike helmet.</li>
                  <li>• If applicable, will wear sunglasses while riding.</li>
                  <li>• Respect and follow all traffic laws and fellow drivers.</li>
                  <li>• Will not use a phone or text while riding.</li>
                  <li>• Never drive under the influence of alcohol.</li>
                  <li>• Will not allow an unauthorized rider(s) to use UPP motorbike unless it is an emergency.</li>
                  <li>• Will not lease, sell, or lend UPP motorbike.</li>
                  <li>• Will not leave the company motorbike unlocked, unattended to or parked in a dangerous area.</li>
                  <li>• Report damages or problems with the motorbike to the CEO in a timely manner.</li>
                  <li>• Document all riding expenses, such as fuel and repair works.</li>
                  <li>• UPP shall give cover riding expenses on a case-by-case basis.</li>
                  <li>• Regularly check the motorbike to ensure it is operating functionally, such as the fuel, tire pressure and breaks.</li>
                  <li>• Will not commit traffic violations which can lead to accidents.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">Accidents</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• If an employee of Universal Printing Press is involved in a motorbike accident with UPP motorbike, they must immediately notify the CEO.</li>
                  <li>• Employees are required to follow all legal guidelines in exchanging information with other riders/drivers and should call the police if the accident is serious.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">Obligations of UPP</h3>
                <p className="text-muted-foreground mb-3">UPP strives to create a safe work environment for all employees and that extends to the company motorbike, therefore we will:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Ensure company motorbike is safe to drive before we assign them.</li>
                  <li>• Schedule periodical maintenance so all motorbikes remain in excellent condition.</li>
                  <li>• Provide employees with a copy of our company motorbike policy if they are assigned a company motorbike.</li>
                  <li>• Insure company motorbike with a reliable insurance provider.</li>
                </ul>
                <p className="text-muted-foreground mb-4">UPP is responsible for:</p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Paying for an employee to make bail if arrested while driving UPP motorbike.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">Disciplinary Consequences</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• If an employee does not follow UPP motorbike policies, they will face disciplinary consequences.</li>
                  <li>• If an employee commits a minor offense, such as letting an unauthorized person ride UPP motorbike, we might issue a reprimand and may revoke the company motorbike.</li>
                  <li>• UPP will terminate an employee or may take legal action if a more serious offense is committed, such as selling the motorbike for personal gain or causing an accident while riding the motorbike drunk.</li>
                </ul>

                <div className="bg-muted/30 p-4 rounded-lg border border-border mt-4">
                  <div className="space-y-3">
                    <div className="border-b border-border pb-2">
                      <p className="text-sm font-medium">Employee's name:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-sm font-medium">Employee's signature:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                      <p className="text-xs text-muted-foreground mt-1">Date:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">CEO signature:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                      <p className="text-xs text-muted-foreground mt-1">Date:</p>
                      <div className="h-8 border-b-2 border-dashed border-muted-foreground mt-2"></div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Procurement & Payment */}
              <section id="procurement" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">25.0 Universal Printing Press Procurement and Payment Policies & Guidelines</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-3">1. Purpose</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The following internal controls are put in place for the procurement and payment of goods and services to not only keep us in business but also make the company profitable.</li>
                  <li>• Any employee with responsibilities for managing Universal Printing Press procurement and payment of products and services should follow this policy.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">2. Procurement of goods and services</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• The office manager shall ask for suppliers' pricing from Berekum, Sunyani, Kumasi and Accra on items to be purchased. This is called Request for Quotations (RFQs).</li>
                  <li>• All procurement phone calls, and text messages must be made by and through the official business phone.</li>
                  <li>• The office manager shall evaluate all received Request for Quotations (RFQs) with the general manager and CEO to ensure that quality meets that which the customer wants.</li>
                  <li>• The office manager shall create a purchase requisition i.e., a document asking for final permission from general manager and CEO to purchase the item.</li>
                  <li>• The purchase requisition shall contain the following information: name of item, suppliers name, address and phone number, total quantity, unit cost of item, profit margin, date of purchase and expected date of receipt.</li>
                  <li>• The office manager shall submit the purchase requisition to the CEO via text message, email or phone call for final approval.</li>
                  <li>• The office manager shall work with the CEO to arrange payment to suppliers. This may be achieved via direct money transfer.</li>
                  <li>• The office manager shall acknowledge receipt of goods from suppliers and document same in the inventory book.</li>
                  <li>• The office manager shall keep all records of receipts of payment and services.</li>
                  <li>• All inventory must be replenished once they fall below 10% of initial order.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4 mb-3">3. Conflict of Interest</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li>• Any conflict of interest in making a purchase shall be thoroughly investigated and the perpetrator held accountable for all economic loss.</li>
                  <li>• A conflict of interest occurs when an employee derive personal benefit from actions or decisions made in their official capacity.</li>
                  <li>• All purchases that need to be made as soon as possible without need to go through this procurement and payment process must be discussed with the general manager and Chief Executive Officer either directly or via phone/text message.</li>
                </ul>
              </section>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Thank you for reading the Universal Printing Press Company Handbook & Policies!</strong>
                </p>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}