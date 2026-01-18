import "./Logo.css";
import { Link } from "react-router-dom";

export default function Logo(isLink) {
  if (isLink) {
    return <Link to={"/"}>{<div className="app-logo">L</div>}</Link>;
  } else {
    return <div className="app-logo">L</div>;
  }
}
