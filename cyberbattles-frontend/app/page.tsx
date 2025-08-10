import logo from "../public/images/logo.png"
import Image from 'next/image'
export default function LoginPage() {
  return (
    <div className="p-10">

      <div className="absolute top-4 left-4 w-25 h-25">
        <Image src={logo} alt="logo of the website"/>     
      </div>
      
    </div>
    
  );
}
