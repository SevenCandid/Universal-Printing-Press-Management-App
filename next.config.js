/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'mtyhkxufhyuctljchcwh.supabase.co',
          port: '', // 👈 add this line (important for some Next versions)
          pathname: '/storage/v1/object/public/**',
        },
      ],
    },
  };
  
  export default nextConfig;
  