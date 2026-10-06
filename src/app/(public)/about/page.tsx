import { Target, Users, Lightbulb, Shield } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            About SplitLedger AI
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
            We&apos;re on a mission to make expense management simple, smart, and stress-free for everyone.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                At SplitLedger AI, we believe managing shared expenses shouldn&apos;t be complicated. 
                We&apos;re building tools that make it effortless to track, split, and settle expenses with friends, 
                family, and colleagues.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Powered by artificial intelligence, our platform automates the tedious parts of expense management 
                so you can focus on what matters - enjoying life with the people you care about.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <Target className="h-16 w-16 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Our Goal</h3>
              <p className="opacity-90">
                To eliminate financial friction in relationships by providing the most intuitive and 
                intelligent expense sharing platform in the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <ValueCard
              icon={<Users className="h-8 w-8" />}
              title="User First"
              description="Every decision we make starts with what's best for our users."
            />
            <ValueCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Innovation"
              description="Constantly improving with AI and cutting-edge technology."
            />
            <ValueCard
              icon={<Shield className="h-8 w-8" />}
              title="Trust"
              description="Bank-level security and complete transparency in everything we do."
            />
            <ValueCard
              icon={<Target className="h-8 w-8" />}
              title="Simplicity"
              description="Complex problems solved with elegant, easy-to-use solutions."
            />
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Our Story</h2>
          <div className="space-y-6 text-lg text-slate-600 dark:text-slate-400">
            <p>
              SplitLedger AI was born from a simple frustration: tracking shared expenses shouldn&apos;t be this hard. 
              Whether it&apos;s splitting a dinner bill, managing trip expenses, or keeping track of loans between friends, 
              the existing solutions were either too complicated or too basic.
            </p>
            <p>
              We asked ourselves: what if expense management could be as simple as sending a message? What if AI 
              could automatically categorize expenses and suggest the fairest way to split them? What if settlements 
              could happen automatically without awkward conversations?
            </p>
            <p>
              Today, SplitLedger AI is helping thousands of users manage their finances effortlessly. We&apos;re just 
              getting started, and we&apos;re excited to build the future of personal finance together with you.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}
