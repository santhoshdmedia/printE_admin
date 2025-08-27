import Inputs from "../../components/Inputs";

const SingleForm = () => {
  const handleSelectChange = (value) => {
    return value;
  };

  return (
    <>
      <div className="flex flex-wrap gap-x-4">
        <Inputs type={"text"} placeholder="Enter Text Box Name" errorMsg={"Text Box Name"} name={"single_text_box_name"} label={"Text Box Name"} w={"w-[300px]"} />
        <Inputs
          placeholder="Select Form Type"
          type="select"
          errorMsg={"Form Type"}
          w={"!w-[300px]"}
          name={"single_text_box_name_type"}
          label={"Form Type"}
          options={[
            {
              id: 1,
              value: "text-only",
            },
            {
              id: 2,
              value: "numbers-only",
            },
            {
              id: 3,
              value: "mixed",
            },
          ]}
          onChange={handleSelectChange}
          value={handleSelectChange()}
        />
      </div>
    </>
  );
};

export default SingleForm;
