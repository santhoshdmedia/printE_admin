import { useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import AddForms from "../Products/AddForms";

const ProductForm = () => {
  const [formStatus, setFormStatus] = useState(false);

  return (
    <div>
      <DefaultTile title={"Predefined Forms"} add={true} addText={"Forms"} formStatus={formStatus} setFormStatus={setFormStatus} />
      {formStatus ? <AddForms /> : "display"}
    </div>
  );
};

export default ProductForm;
