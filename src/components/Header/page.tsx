import AuthButton from "../AuthButton";
import { ModeToggle } from "../Toggle";


const Header = () => {
    return (
        <div>
            <ModeToggle />
            <AuthButton />
        </div>
    );
}
 
export default Header;